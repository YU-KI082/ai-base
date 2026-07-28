import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import {
  buildOpsDashboard,
  saveAutoOpsSettings,
  type AutoOpsSettings,
} from "@ai-base/sns-auto-ops";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const data = await buildOpsDashboard();
    return jsonOk(data);
  });
}

export async function PATCH(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const body = await readJson<Partial<AutoOpsSettings>>(request);
    try {
      const settings = await saveAutoOpsSettings(body);
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
      alertId?: string;
    };
    if (body.action === "ack_alert" && body.alertId) {
      await repos.opsAlerts.acknowledge(body.alertId);
      return jsonOk({ ok: true });
    }
    if (body.action === "emergency_stop") {
      const settings = await saveAutoOpsSettings({ emergencyStop: true });
      return jsonOk({ settings });
    }
    if (body.action === "resume") {
      const settings = await saveAutoOpsSettings({ emergencyStop: false });
      return jsonOk({ settings });
    }
    if (body.action === "run_tick") {
      await enqueueEvent(
        createEvent({
          type: EventTypes.SnsAutoOpsTick,
          source: "admin:ops",
          dataschema: "https://ai-base.local/schemas/sns-auto-ops-tick.json",
          correlationid: `ops-${Date.now()}`,
          data: { reason: "manual" as const },
        }),
      );
      return jsonOk({ queued: true });
    }
    return jsonError("Unknown action", 400);
  });
}
