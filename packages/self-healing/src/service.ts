import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { repos } from "@ai-base/database";
import { analyzeError, canApplyPatches, fingerprintError } from "./policy.js";
import { applyPatches, proposeFix, rollbackPatches, type ProposedFix } from "./healers.js";
import {
  defaultSelfHealingSettings,
  parseSelfHealingSettings,
  SELF_HEALING_SETTING_KEY,
  type SelfHealingSettings,
} from "./settings.js";

const execFileAsync = promisify(execFile);

export async function loadSelfHealingSettings(): Promise<SelfHealingSettings> {
  const raw = await repos.settings.getJson(SELF_HEALING_SETTING_KEY);
  if (!raw) return defaultSelfHealingSettings();
  try {
    return parseSelfHealingSettings(raw);
  } catch {
    return defaultSelfHealingSettings();
  }
}

export async function saveSelfHealingSettings(
  patch: Partial<SelfHealingSettings>,
): Promise<SelfHealingSettings> {
  const current = await loadSelfHealingSettings();
  const next = parseSelfHealingSettings({
    ...current,
    ...patch,
    allowProductionDirectApply: false,
  });
  await repos.settings.upsertJson(SELF_HEALING_SETTING_KEY, next as object);
  return next;
}

export async function reportError(input: {
  title?: string;
  message: string;
  kind?: string;
  location?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}) {
  const analysis = analyzeError(input);
  const fingerprint = fingerprintError({
    message: input.message,
    location: input.location ?? analysis.suggestedLocation,
    kind: analysis.errorKind,
  });

  const existing = await repos.selfHealing.findOpenByFingerprint(fingerprint);
  if (existing && existing.attemptCount >= existing.maxAttempts) {
    return {
      incident: existing,
      analysis,
      skipped: true as const,
      reason: "max_attempts",
    };
  }

  if (existing) {
    return { incident: existing, analysis, skipped: false as const };
  }

  const incident = await repos.selfHealing.createIncident({
    fingerprint,
    title: input.title ?? analysis.cause.slice(0, 120),
    message: input.message.slice(0, 4000),
    kind: analysis.errorKind,
    severity: analysis.severity,
    location: input.location ?? analysis.suggestedLocation,
    cause: analysis.cause,
    requiresApproval: analysis.requiresApproval,
    maxAttempts: (await loadSelfHealingSettings()).maxAttemptsPerFingerprint,
    metadata: {
      ...(input.metadata ?? {}),
      autoHealKind: analysis.autoHealKind,
      forbiddenKind: analysis.forbiddenKind,
      propertyName: analysis.propertyName,
      stack: input.stack?.slice(0, 2000),
    },
  });

  return { incident, analysis, skipped: false as const };
}

async function runVerify(commands: string[]): Promise<{
  ok: boolean;
  results: Array<{ command: string; ok: boolean; output: string }>;
}> {
  const results: Array<{ command: string; ok: boolean; output: string }> = [];
  for (const command of commands) {
    try {
      const { stdout, stderr } = await execFileAsync("bash", ["-lc", command], {
        cwd: process.env.AI_BASE_ROOT ?? process.cwd(),
        timeout: 180_000,
        env: { ...process.env, NEXT_PUBLIC_DEFAULT_LOCALE: "ja" },
        maxBuffer: 2_000_000,
      });
      results.push({
        command,
        ok: true,
        output: `${stdout}\n${stderr}`.slice(0, 4000),
      });
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string };
      results.push({
        command,
        ok: false,
        output: `${err.stdout ?? ""}\n${err.stderr ?? err.message ?? String(error)}`.slice(
          0,
          4000,
        ),
      });
      return { ok: false, results };
    }
  }
  return { ok: true, results };
}

export async function processIncident(incidentId: string): Promise<{
  status: string;
  changedFiles: string[];
  requiresApproval: boolean;
}> {
  const settings = await loadSelfHealingSettings();
  const incident = await repos.selfHealing.getById(incidentId);
  if (!incident) {
    return { status: "missing", changedFiles: [], requiresApproval: true };
  }

  if (settings.emergencyStop) {
    await repos.selfHealing.updateIncident(incident.id, { status: "stopped" });
    return { status: "stopped", changedFiles: [], requiresApproval: incident.requiresApproval };
  }

  if (incident.attemptCount >= incident.maxAttempts) {
    await repos.selfHealing.updateIncident(incident.id, {
      status: "failed",
      cause: `${incident.cause ?? ""} (max attempts)`,
    });
    return { status: "failed", changedFiles: [], requiresApproval: true };
  }

  const analysis = analyzeError({
    message: incident.message,
    kind: incident.kind,
    location: incident.location ?? undefined,
  });

  const proposal = proposeFix({
    message: incident.message,
    analysis,
    maxFiles: settings.maxFilesPerFix,
  });

  await repos.selfHealing.updateIncident(incident.id, {
    status: analysis.requiresApproval || !proposal.autoAllowed ? "needs_approval" : "healing",
    cause: analysis.cause,
    requiresApproval: analysis.requiresApproval || !proposal.autoAllowed,
    proposedFix: proposal as object,
  });

  if (analysis.requiresApproval || !proposal.autoAllowed) {
    await repos.selfHealing.addAttempt({
      incidentId: incident.id,
      attemptNumber: incident.attemptCount + 1,
      action: "propose",
      success: true,
      changedFiles: proposal.patches.map((p) => p.path),
      diff: { proposal } as object,
    });
    await repos.selfHealing.updateIncident(incident.id, {
      status: "needs_approval",
      attemptCount: incident.attemptCount + 1,
    });
    return {
      status: "needs_approval",
      changedFiles: proposal.patches.map((p) => p.path),
      requiresApproval: true,
    };
  }

  return applyProposal(incident.id, proposal, settings, incident.attemptCount);
}

async function applyProposal(
  incidentId: string,
  proposal: ProposedFix,
  settings: SelfHealingSettings,
  attemptCount: number,
) {
  const gate = canApplyPatches(settings);
  if (!gate.ok) {
    await repos.selfHealing.updateIncident(incidentId, {
      status: gate.reason === "emergency_stop" ? "stopped" : "needs_approval",
      requiresApproval: true,
      proposedFix: proposal as object,
    });
    return {
      status: gate.reason === "emergency_stop" ? "stopped" : "needs_approval",
      changedFiles: [],
      requiresApproval: true,
    };
  }

  const nextAttempt = attemptCount + 1;
  let backup: Record<string, string> = {};
  let changedFiles: string[] = [];

  try {
    await repos.selfHealing.updateIncident(incidentId, {
      status: "healing",
      diffBefore: {} as object,
    });

    const applied = applyPatches(proposal.patches);
    backup = applied.backup;
    changedFiles = applied.changedFiles;

    await repos.selfHealing.updateIncident(incidentId, {
      status: "verifying",
      changedFiles,
      diffBefore: backup as object,
      attemptCount: nextAttempt,
    });

    const verify =
      proposal.verifyCommands.length > 0
        ? await runVerify(proposal.verifyCommands)
        : { ok: true, results: [] as Array<{ command: string; ok: boolean; output: string }> };

    if (!verify.ok) {
      const rb = rollbackPatches(backup);
      await repos.selfHealing.addAttempt({
        incidentId,
        attemptNumber: nextAttempt,
        action: "rollback",
        success: rb.ok,
        changedFiles,
        testResults: verify.results as object,
        errorMessage: "verification_failed",
        diff: { backupKeys: Object.keys(backup) } as object,
      });
      await repos.selfHealing.updateIncident(incidentId, {
        status: "rolled_back",
        testResults: verify.results as object,
        rollbackResult: rb as object,
      });
      return { status: "rolled_back", changedFiles, requiresApproval: false };
    }

    await repos.selfHealing.addAttempt({
      incidentId,
      attemptNumber: nextAttempt,
      action: "auto_heal",
      success: true,
      changedFiles,
      testResults: verify.results as object,
      diff: {
        patches: proposal.patches.map((p) => ({
          path: p.path,
          rationale: p.rationale,
        })),
      } as object,
    });

    await repos.selfHealing.updateIncident(incidentId, {
      status: "healed",
      healedAt: new Date(),
      testResults: verify.results as object,
      changedFiles,
      requiresApproval: false,
    });

    return { status: "healed", changedFiles, requiresApproval: false };
  } catch (error) {
    const rb = rollbackPatches(backup);
    await repos.selfHealing.addAttempt({
      incidentId,
      attemptNumber: nextAttempt,
      action: "rollback",
      success: rb.ok,
      changedFiles,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    await repos.selfHealing.updateIncident(incidentId, {
      status: "rolled_back",
      rollbackResult: rb as object,
      attemptCount: nextAttempt,
    });
    return { status: "rolled_back", changedFiles, requiresApproval: true };
  }
}

export async function approveAndApply(incidentId: string) {
  const settings = await loadSelfHealingSettings();
  if (settings.emergencyStop) {
    return { status: "stopped", changedFiles: [] as string[] };
  }
  const incident = await repos.selfHealing.getById(incidentId);
  if (!incident?.proposedFix) {
    return { status: "missing", changedFiles: [] as string[] };
  }
  const proposal = incident.proposedFix as ProposedFix;
  // Human approval overrides requiresApproval for this apply
  const forced: ProposedFix = { ...proposal, autoAllowed: true };
  return applyProposal(incidentId, forced, settings, incident.attemptCount);
}

export async function buildSelfHealingDashboard() {
  const settings = await loadSelfHealingSettings();
  const open = await repos.selfHealing.listOpen(50);
  const history = await repos.selfHealing.listHistory(30);
  return {
    settings,
    open,
    history,
    canApplyInThisRuntime: canApplyPatches(settings),
  };
}

/** Record the known featured incident as detected then healed (post-fix audit). */
export async function seedFeaturedIncidentHealed() {
  const message = "Cannot read properties of undefined (reading 'featured')";
  const reported = await reportError({
    title: "Runtime: public.featured undefined",
    message,
    kind: "runtime",
    location: "apps/web/app/(public)/tools/page.tsx",
    metadata: { source: "self-healing-bootstrap" },
  });
  const result = await processIncident(reported.incident.id);
  return { incidentId: reported.incident.id, ...result };
}
