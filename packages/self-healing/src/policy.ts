import { createHash } from "node:crypto";

export const AUTO_HEAL_KINDS = [
  "i18n_missing_key",
  "null_undefined_safe",
  "type_mismatch_simple",
  "import_missing",
  "api_response_shape",
  "cache_inconsistency",
  "service_restart",
  "transient_network",
] as const;

export type AutoHealKind = (typeof AUTO_HEAL_KINDS)[number];

export const FORBIDDEN_AUTO_HEAL = [
  "db_schema_destructive",
  "data_deletion",
  "auth_permission_major",
  "payment",
  "affiliate_attribution",
  "secrets_env_change",
  "sns_account_settings",
  "bulk_rewrite",
  "unknown_cause",
] as const;

export type ForbiddenHealKind = (typeof FORBIDDEN_AUTO_HEAL)[number];

export type ErrorKind =
  | "runtime"
  | "typescript"
  | "build"
  | "api"
  | "prisma"
  | "i18n"
  | "null_ref"
  | "env"
  | "test"
  | "dependency"
  | "job"
  | "other";

export type Analysis = {
  errorKind: ErrorKind;
  cause: string;
  severity: "low" | "medium" | "high" | "critical";
  autoHealKind: AutoHealKind | null;
  forbiddenKind: ForbiddenHealKind | null;
  requiresApproval: boolean;
  propertyName?: string;
  suggestedLocation?: string;
};

export function fingerprintError(input: {
  message: string;
  location?: string | null;
  kind?: string | null;
}): string {
  const normalized = input.message
    .replace(/\s+/g, " ")
    .replace(/0x[0-9a-f]+/gi, "0x?")
    .replace(/\d{4,}/g, "#")
    .slice(0, 400);
  const raw = `${input.kind ?? ""}|${input.location ?? ""}|${normalized}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function analyzeError(input: {
  message: string;
  kind?: string;
  location?: string;
  stack?: string;
}): Analysis {
  const msg = input.message;
  const loc = input.location ?? guessLocation(input.stack);

  // Forbidden patterns first
  if (/drop\s+table|prisma\s+migrate\s+reset|deleteMany|TRUNCATE/i.test(msg)) {
    return base("prisma", "破壊的DB操作の疑い", "critical", null, "db_schema_destructive", loc);
  }
  if (/payment|stripe|決済/i.test(msg)) {
    return base("other", "決済関連", "critical", null, "payment", loc);
  }
  if (/affiliate.*(click|conversion|归因|成果)/i.test(msg)) {
    return base("other", "アフィリエイト計測", "high", null, "affiliate_attribution", loc);
  }
  if (/TOKEN_|SECRET|API_KEY|password|環境変数を変更/i.test(msg)) {
    return base("env", "秘密情報・環境変数", "critical", null, "secrets_env_change", loc);
  }
  if (/oauth|sns.*(account|接続設定)/i.test(msg) && /change|更新|設定/i.test(msg)) {
    return base("other", "SNSアカウント設定", "high", null, "sns_account_settings", loc);
  }

  // Auto-healable
  const featured = /reading ['"]featured['"]/i.exec(msg);
  const undefProp = /Cannot read propert(?:y|ies) of undefined \(reading ['"](\w+)['"]\)/i.exec(msg);
  if (featured || undefProp) {
    const prop = featured ? "featured" : undefProp![1];
    return {
      errorKind: prop === "featured" || /i18n|dictionary|locale/i.test(loc ?? "") ? "i18n" : "null_ref",
      cause:
        prop === "featured"
          ? "翻訳辞書または locale 解決の不整合で public が undefined、featured 参照でランタイムエラー"
          : `undefined 参照: ${prop}`,
      severity: "high",
      autoHealKind: prop === "featured" ? "i18n_missing_key" : "null_undefined_safe",
      forbiddenKind: null,
      requiresApproval: false,
      propertyName: prop,
      suggestedLocation: loc ?? "apps/web/app/(public)/tools/page.tsx",
    };
  }

  if (/missing translation|i18n|translation key/i.test(msg)) {
    return base("i18n", "翻訳キー不足", "medium", "i18n_missing_key", null, loc);
  }
  if (/Cannot find module|ERR_MODULE_NOT_FOUND|is not exported/i.test(msg)) {
    return base("dependency", "import / 依存関係", "medium", "import_missing", null, loc);
  }
  if (/ECONNRESET|ETIMEDOUT|socket hang up|fetch failed/i.test(msg)) {
    return base("job", "一時的なネットワーク失敗", "low", "transient_network", null, loc);
  }
  if (/TS\d{4}|Type '.*' is not assignable/i.test(msg)) {
    return base("typescript", "型不整合", "medium", "type_mismatch_simple", null, loc);
  }
  if (/PrismaClient|P\d{4}/i.test(msg)) {
    return base("prisma", "Prismaエラー", "high", null, "unknown_cause", loc, true);
  }
  if (/\b4\d{2}\b|\b5\d{2}\b|status code/i.test(msg) && /api|fetch|HTTP/i.test(msg)) {
    return base("api", "APIエラー", "medium", "api_response_shape", null, loc, true);
  }
  if (/FAIL|AssertionError|test failed/i.test(msg)) {
    return base("test", "テスト失敗", "medium", null, "unknown_cause", loc, true);
  }
  if (/Missing env|is not defined.*env|ENVIRONMENT/i.test(msg)) {
    return base("env", "環境変数不足", "high", null, "secrets_env_change", loc);
  }

  return base(
    (input.kind as ErrorKind) || "runtime",
    "原因を特定できない",
    "high",
    null,
    "unknown_cause",
    loc,
  );
}

function base(
  errorKind: ErrorKind,
  cause: string,
  severity: Analysis["severity"],
  autoHealKind: AutoHealKind | null,
  forbiddenKind: ForbiddenHealKind | null,
  location?: string,
  forceApproval = false,
): Analysis {
  const requiresApproval =
    forceApproval || !autoHealKind || forbiddenKind != null;
  return {
    errorKind,
    cause,
    severity,
    autoHealKind,
    forbiddenKind,
    requiresApproval,
    suggestedLocation: location,
  };
}

function guessLocation(stack?: string): string | undefined {
  if (!stack) return undefined;
  const m = stack.match(/(apps\/web\/[^\s:]+|packages\/[^\s:]+):\d+/);
  return m?.[0];
}

/** Production must never receive direct patch application. */
export function canApplyPatches(settings: {
  emergencyStop: boolean;
  allowProductionDirectApply: boolean;
}): { ok: boolean; reason?: string } {
  if (settings.emergencyStop) {
    return { ok: false, reason: "emergency_stop" };
  }
  if (process.env.NODE_ENV === "production" && !settings.allowProductionDirectApply) {
    return { ok: false, reason: "production_direct_apply_forbidden" };
  }
  // Schema forces allowProductionDirectApply=false; belt-and-suspenders:
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "production_direct_apply_forbidden" };
  }
  return { ok: true };
}
