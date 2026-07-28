import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import {
  approveAndApply,
  buildSelfHealingDashboard,
  processIncident,
  saveSelfHealingSettings,
  seedFeaturedIncidentHealed,
  type SelfHealingSettings,
} from "@ai-base/self-healing";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const data = await buildSelfHealingDashboard();
    return jsonOk(data);
  });
}

export async function PATCH(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const body = await readJson<Partial<SelfHealingSettings>>(request);
    try {
      const settings = await saveSelfHealingSettings(body);
      return jsonOk({ settings });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : String(error), 400);
    }
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      incidentId?: string;
    };

    if (body.action === "emergency_stop") {
      const settings = await saveSelfHealingSettings({ emergencyStop: true });
      return jsonOk({ settings });
    }
    if (body.action === "resume") {
      const settings = await saveSelfHealingSettings({ emergencyStop: false });
      return jsonOk({ settings });
    }
    if (body.action === "run_tick") {
      await enqueueEvent(
        createEvent({
          type: EventTypes.SelfHealingTick,
          source: "admin:self-healing",
          dataschema: "https://ai-base.local/schemas/self-healing-tick.json",
          correlationid: `heal-${Date.now()}`,
          data: { reason: "manual" as const },
        }),
      );
      return jsonOk({ queued: true });
    }
    if (body.action === "process" && body.incidentId) {
      const result = await processIncident(body.incidentId);
      return jsonOk(result);
    }
    if (body.action === "approve" && body.incidentId) {
      const result = await approveAndApply(body.incidentId);
      return jsonOk(result);
    }
    if (body.action === "ack" && body.incidentId) {
      await repos.selfHealing.acknowledge(body.incidentId);
      return jsonOk({ ok: true });
    }
    if (body.action === "seed_featured") {
      process.env.AI_BASE_ROOT =
        process.env.AI_BASE_ROOT ?? process.cwd().replace(/\/apps\/web$/, "");
      const prevStop = (await saveSelfHealingSettings({})).emergencyStop;
      await saveSelfHealingSettings({ emergencyStop: false });
      try {
        const result = await seedFeaturedIncidentHealed();
        return jsonOk(result);
      } finally {
        await saveSelfHealingSettings({ emergencyStop: prevStop });
      }
    }
    return jsonError("Unknown action", 400);
  });
}
