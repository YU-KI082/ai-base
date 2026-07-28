import type { AgentContext, AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SelfHealingErrorReportedDataSchema,
  SelfHealingTickDataSchema,
} from "@ai-base/events";
import { repos } from "@ai-base/database";
import {
  loadSelfHealingSettings,
  processIncident,
  reportError,
} from "@ai-base/self-healing";

/**
 * Self-Healing Agent — detect → analyze → safe patch → verify → apply/rollback.
 * Never applies patches in production. Forbidden domains stay approval-only.
 */
export const selfHealingPlugin: AgentPlugin = {
  manifest: {
    key: "self-healing",
    version: "0.1.0",
    displayName: { en: "Self-Healing", ja: "自動修復" },
    subscribe: [
      EventTypes.SelfHealingTick,
      EventTypes.SelfHealingErrorReported,
      EventTypes.AgentRunFailed,
    ],
    publish: [
      EventTypes.SelfHealingResolved,
      EventTypes.SelfHealingNeedsApproval,
    ],
    capabilities: ["error_detection", "safe_auto_fix", "verify_gate"],
  },

  async handle(ctx, event) {
    if (event.type === EventTypes.SelfHealingErrorReported) {
      const parsed = parseEvent(event, SelfHealingErrorReportedDataSchema);
      const reported = await reportError({
        title: parsed.data.title,
        message: parsed.data.message,
        kind: parsed.data.kind,
        location: parsed.data.location,
        stack: parsed.data.stack,
        metadata: parsed.data.metadata as Record<string, unknown> | undefined,
      });
      await healOne(ctx, event.correlationid, event.id, reported.incident.id);
      return;
    }

    if (event.type === EventTypes.AgentRunFailed) {
      const data = event.data as {
        error?: string;
        agentKey?: string;
        runId?: string;
      };
      const message = data.error ?? "agent.run.failed";
      const reported = await reportError({
        title: `Agent failed: ${data.agentKey ?? "unknown"}`,
        message,
        kind: "job",
        location: data.agentKey ? `agent:${data.agentKey}` : undefined,
        metadata: { runId: data.runId },
      });
      await healOne(ctx, event.correlationid, event.id, reported.incident.id);
      return;
    }

    if (event.type !== EventTypes.SelfHealingTick) return;
    parseEvent(event, SelfHealingTickDataSchema);
    const settings = await loadSelfHealingSettings();
    if (settings.emergencyStop) {
      await ctx.logger.info("Self-healing skipped: emergency stop ON");
      return;
    }

    const open = await repos.selfHealing.listOpen(20);
    for (const incident of open) {
      if (incident.status === "needs_approval") continue;
      if (["healed", "stopped", "failed"].includes(incident.status)) continue;
      await healOne(ctx, event.correlationid, event.id, incident.id);
    }
  },
};

async function healOne(
  ctx: AgentContext,
  correlationid: string,
  causationid: string,
  incidentId: string,
) {
  const result = await processIncident(incidentId);
  await ctx.logger.info(`Self-healing ${incidentId} → ${result.status}`, {
    changedFiles: result.changedFiles,
  });

  if (result.status === "healed") {
    await ctx.publish(
      createEvent({
        type: EventTypes.SelfHealingResolved,
        source: "agent:self-healing",
        dataschema: "https://ai-base.local/schemas/self-healing-resolved.json",
        correlationid,
        causationid,
        data: {
          incidentId,
          status: result.status,
          changedFiles: result.changedFiles,
        },
      }),
    );
  } else if (result.requiresApproval || result.status === "needs_approval") {
    const incident = await repos.selfHealing.getById(incidentId);
    await ctx.publish(
      createEvent({
        type: EventTypes.SelfHealingNeedsApproval,
        source: "agent:self-healing",
        dataschema:
          "https://ai-base.local/schemas/self-healing-needs-approval.json",
        correlationid,
        causationid,
        data: {
          incidentId,
          title: incident?.title ?? "Self-healing needs approval",
          reason: incident?.cause ?? "requires_approval",
        },
      }),
    );
  }
}
