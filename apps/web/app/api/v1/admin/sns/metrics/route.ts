import { randomUUID } from "node:crypto";
import {
  createEvent,
  enqueueEvent,
  EventTypes,
} from "@ai-base/events";
import { assertNoFabricatedMetrics } from "@ai-base/sns-learning";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

/** Ingest real own-post metrics (manual or future official API). Never invent. */
export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const body = await readJson<{
      socialPostId?: string;
      windowHours?: 24 | 72 | 168;
      source?: "manual" | "official_api";
      metrics?: Record<string, number | null>;
    }>(request);

    if (!body.socialPostId || !body.windowHours || !body.metrics) {
      return jsonError("socialPostId, windowHours, metrics required");
    }

    try {
      assertNoFabricatedMetrics(body.metrics);
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "invalid metrics");
    }

    const correlationId = randomUUID();
    const event = createEvent({
      type: EventTypes.SnsMetricsIngestRequested,
      source: "admin:sns-metrics",
      dataschema:
        "https://ai-base.local/schemas/sns.metrics.ingest.requested.v1.json",
      correlationid: correlationId,
      data: {
        socialPostId: body.socialPostId,
        windowHours: body.windowHours,
        source: body.source ?? "manual",
        metrics: body.metrics,
      },
    });
    await enqueueEvent(event);
    return jsonOk({ ok: true, eventId: event.id, correlationId });
  });
}
