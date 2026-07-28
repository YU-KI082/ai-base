import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import { refreshDueConnections } from "@ai-base/sns-oauth";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";

/**
 * Runs due token refreshes immediately and enqueues a bus tick for workers.
 */
export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const results = await refreshDueConnections();
    await enqueueEvent(
      createEvent({
        type: EventTypes.SnsOAuthRefreshTick,
        source: "admin:social",
        dataschema: "https://ai-base.local/schemas/sns-oauth-refresh.json",
        correlationid: `oauth-refresh-${Date.now()}`,
        data: { reason: "manual" as const },
      }),
    );
    return jsonOk({ results, queued: true });
  });
}
