import { randomUUID } from "node:crypto";
import { repos } from "@ai-base/database";
import {
  createEvent,
  enqueueEvent,
  EventTypes,
} from "@ai-base/events";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  return withAdmin(request, "tools.read", async () => {
    const data = await repos.snsLearning.dashboard();
    return jsonOk(data);
  });
}

/** Start / continue the SNS learning feedback loop */
export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      socialPostId?: string;
      windowHours?: 24 | 72 | 168;
    };
    const correlationId = randomUUID();
    const action = body.action ?? "run_loop";

    if (action === "feedback_tick") {
      const event = createEvent({
        type: EventTypes.SnsFeedbackTick,
        source: "admin:sns",
        dataschema: "https://ai-base.local/schemas/sns.feedback.tick.v1.json",
        correlationid: correlationId,
        data: {
          windowHours: body.windowHours ?? 24,
          socialPostId: body.socialPostId,
        },
      });
      await enqueueEvent(event);
      return jsonOk({ ok: true, eventId: event.id, correlationId });
    }

    if (action === "score_post" && body.socialPostId) {
      const event = createEvent({
        type: EventTypes.SnsPostScoreRequested,
        source: "admin:sns",
        dataschema: "https://ai-base.local/schemas/sns.post.score.requested.v1.json",
        correlationid: correlationId,
        data: { socialPostId: body.socialPostId },
      });
      await enqueueEvent(event);
      return jsonOk({ ok: true, eventId: event.id, correlationId });
    }

    const scout = createEvent({
      type: EventTypes.SnsTrendScoutRequested,
      source: "admin:sns",
      dataschema: "https://ai-base.local/schemas/sns.trend.scout.requested.v1.json",
      correlationid: correlationId,
      data: {
        platforms: ["instagram", "tiktok"],
        locales: ["en", "ja"],
        useSeedCatalog: true,
      },
    });
    await enqueueEvent(scout);
    return jsonOk({
      ok: true,
      eventId: scout.id,
      correlationId,
      note: "Learning loop started: scout → patterns → experiments → recommendations → scored drafts (publish stays human-gated)",
    });
  });
}
