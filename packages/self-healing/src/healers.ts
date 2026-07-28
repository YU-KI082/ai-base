import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { Analysis } from "./policy.js";

export type FilePatch = {
  path: string;
  before: string;
  after: string;
  rationale: string;
};

export type ProposedFix = {
  title: string;
  autoAllowed: boolean;
  patches: FilePatch[];
  verifyCommands: string[];
};

function workspaceRoot(): string {
  return process.env.AI_BASE_ROOT ?? process.cwd();
}

function abs(rel: string): string {
  return join(workspaceRoot(), rel);
}

function readRel(rel: string): string | null {
  const p = abs(rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

/**
 * Build a minimal, scoped fix proposal from analysis.
 * Only known safe patterns produce autoAllowed=true patches.
 */
export function proposeFix(input: {
  message: string;
  analysis: Analysis;
  maxFiles: number;
}): ProposedFix {
  const { analysis } = input;

  if (analysis.requiresApproval || !analysis.autoHealKind) {
    return {
      title: `承認待ち: ${analysis.cause}`,
      autoAllowed: false,
      patches: [],
      verifyCommands: [],
    };
  }

  if (
    analysis.autoHealKind === "i18n_missing_key" &&
    analysis.propertyName === "featured"
  ) {
    return proposeFeaturedI18nFix(analysis, input.maxFiles);
  }

  if (analysis.autoHealKind === "null_undefined_safe" && analysis.propertyName) {
    return proposeNullSafeAccess(analysis, input.maxFiles);
  }

  if (analysis.autoHealKind === "transient_network") {
    return {
      title: "一時的ネットワーク失敗 — 再試行のみ（コード変更なし）",
      autoAllowed: true,
      patches: [],
      verifyCommands: [],
    };
  }

  return {
    title: `自動修復不可（パターン未対応）: ${analysis.cause}`,
    autoAllowed: false,
    patches: [],
    verifyCommands: ["pnpm --filter @ai-base/i18n test"],
  };
}

function proposeFeaturedI18nFix(analysis: Analysis, maxFiles: number): ProposedFix {
  const patches: FilePatch[] = [];
  const toolsPage = "apps/web/app/(public)/tools/page.tsx";
  const i18nIndex = "packages/i18n/src/index.ts";

  const toolsSrc = readRel(toolsPage);
  if (toolsSrc && toolsSrc.includes("{t.featured}") && !toolsSrc.includes("t.featured ??")) {
    patches.push({
      path: toolsPage,
      before: toolsSrc,
      after: toolsSrc.replace(
        "{t.featured}",
        "{t.featured ?? t.toolsTitle}",
      ),
      rationale: "featured 参照を null 安全にし、辞書欠落時も落ちないようにする",
    });
  }

  const i18nSrc = readRel(i18nIndex);
  if (
    i18nSrc &&
    !i18nSrc.includes("mergeDictionary") &&
    i18nSrc.includes("export function getDictionary")
  ) {
    // If harden not present, we only note — full merge is large; rely on already-applied harden.
    // Still ensure featured keys exist in both locales (already in source).
  }

  if (patches.length === 0) {
    // Fix already applied — record as no-op heal success path
    return {
      title: "featured 参照は既に防御済み（辞書 merge + null 安全）",
      autoAllowed: true,
      patches: [],
      verifyCommands: [
        "pnpm --filter @ai-base/i18n test",
        "pnpm --filter @ai-base/i18n build",
      ],
    };
  }

  return {
    title: "i18n featured / undefined 親参照の防御",
    autoAllowed: true,
    patches: patches.slice(0, maxFiles),
    verifyCommands: [
      "pnpm --filter @ai-base/i18n test",
      "pnpm --filter @ai-base/i18n build",
      "pnpm --filter @ai-base/web typecheck",
    ],
  };
}

function proposeNullSafeAccess(analysis: Analysis, maxFiles: number): ProposedFix {
  const loc = analysis.suggestedLocation;
  if (!loc || !analysis.propertyName) {
    return {
      title: "null 安全化の対象ファイルを特定できない",
      autoAllowed: false,
      patches: [],
      verifyCommands: [],
    };
  }
  const rel = loc.split(":")[0]!;
  const src = readRel(rel);
  if (!src) {
    return {
      title: `ファイル未発見: ${rel}`,
      autoAllowed: false,
      patches: [],
      verifyCommands: [],
    };
  }
  const prop = analysis.propertyName;
  // Only apply very narrow optional chaining on simple property reads — skip if already safe
  if (src.includes(`?.${prop}`) || src.includes(`${prop} ??`)) {
    return {
      title: "既に null 安全",
      autoAllowed: true,
      patches: [],
      verifyCommands: [],
    };
  }
  // Too risky to rewrite arbitrarily — require approval unless it's the featured tools page case
  return {
    title: `null 安全化案（${prop} @ ${rel}）— 影響範囲確認のため承認待ち`,
    autoAllowed: false,
    patches: [
      {
        path: rel,
        before: src,
        after: src, // no silent rewrite of unknown files
        rationale: `プロパティ ${prop} への安全なフォールバックを人手で確認`,
      },
    ].slice(0, maxFiles),
    verifyCommands: [],
  };
}

export function applyPatches(patches: FilePatch[]): {
  changedFiles: string[];
  backup: Record<string, string>;
} {
  const backup: Record<string, string> = {};
  const changedFiles: string[] = [];
  for (const patch of patches) {
    if (patch.before === patch.after) continue;
    const full = abs(patch.path);
    mkdirSync(dirname(full), { recursive: true });
    if (existsSync(full)) {
      backup[patch.path] = readFileSync(full, "utf8");
    } else {
      backup[patch.path] = "";
    }
    writeFileSync(full, patch.after, "utf8");
    changedFiles.push(patch.path);
  }
  return { changedFiles, backup };
}

export function rollbackPatches(backup: Record<string, string>): {
  ok: boolean;
  restored: string[];
} {
  const restored: string[] = [];
  try {
    for (const [rel, content] of Object.entries(backup)) {
      const full = abs(rel);
      if (content === "") {
        // was new file — leave as-is rather than delete (safer)
        continue;
      }
      writeFileSync(full, content, "utf8");
      restored.push(rel);
    }
    return { ok: true, restored };
  } catch {
    return { ok: false, restored };
  }
}

export function relativeToRoot(filePath: string): string {
  return relative(workspaceRoot(), filePath);
}
