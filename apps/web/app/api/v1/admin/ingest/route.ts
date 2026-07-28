import { randomUUID } from "node:crypto";
import {
  createEvent,
  enqueueEvent,
  EventTypes,
} from "@ai-base/events";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function POST(request: Request) {
  return withAdmin(request, "agents.manage", async () => {
    const body = await readJson<{
      name?: string;
      homepageUrl?: string;
      sourceName?: string;
      sourceUrl?: string;
      externalId?: string;
      description?: string;
      categoryHints?: string[];
    }>(request);

    if (!body.name || !body.homepageUrl) {
      return jsonError("name and homepageUrl are required");
    }

    const correlationId = randomUUID();
    const event = createEvent({
      type: EventTypes.IngestManualRequested,
      source: "admin:ingest",
      dataschema: "https://ai-base.local/schemas/ingest.manual.requested.v1.json",
      correlationid: correlationId,
      data: {
        name: body.name,
        homepageUrl: body.homepageUrl,
        sourceName: body.sourceName ?? "manual",
        sourceUrl: body.sourceUrl,
        externalId: body.externalId,
        description: body.description,
        categoryHints: body.categoryHints ?? [],
      },
    });
    await enqueueEvent(event);
    return jsonOk({ ok: true, eventId: event.id, correlationId });
  });
}
