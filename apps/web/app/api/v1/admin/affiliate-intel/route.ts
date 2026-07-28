import { randomUUID } from "node:crypto";
import { repos } from "@ai-base/database";
import { proposeAspInvestigations } from "@ai-base/affiliate-intel";
import {
  createEvent,
  enqueueEvent,
  EventTypes,
} from "@ai-base/events";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const rows = await repos.affiliateIntel.performanceByTool();
    return jsonOk({ items: rows });
  });
}

export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      toolId?: string;
    };
    const action = body.action ?? "backfill";

    if (action === "sync_now") {
      const tools = await repos.tools.findPublished("en", { take: 500 });
      const proposals = proposeAspInvestigations();
      const before = await repos.affiliateIntel.listIntelligence();
      const existingIds = new Set(before.map((b) => b.toolId));
      let created = 0;
      for (const tool of tools) {
        await repos.affiliateIntel.ensureForTool({
          toolId: tool.id,
          homepageUrl: tool.homepageUrl,
          leads: proposals.map((p) => ({
            aspKey: p.aspKey,
            aspLabel: p.aspLabel,
            status: p.status,
            notes: p.notes,
            proposedBy: "admin-sync",
          })),
        });
        if (!existingIds.has(tool.id)) created += 1;
      }
      return jsonOk({ ok: true, created });
    }

    const correlationId = randomUUID();
    const event = createEvent({
      type: EventTypes.AffiliateIntelRequested,
      source: "admin:affiliate-intel",
      dataschema:
        "https://ai-base.local/schemas/affiliate.intel.requested.v1.json",
      correlationid: correlationId,
      data: {
        toolId: body.toolId,
        backfillAll: action === "backfill",
      },
    });
    await enqueueEvent(event);
    return jsonOk({ ok: true, eventId: event.id, correlationId });
  });
}
