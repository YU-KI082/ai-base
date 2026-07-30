import { ensureDailyBrief } from "@ai-base/marketing-os";
import { withOsUser } from "../../_lib";

/** GET/POST today's AI employee briefing (idempotent per dateKey). */
export async function GET(request: Request) {
  return withOsUser(request, async (ctx) => {
    const result = await ensureDailyBrief(ctx.workspaceId);
    return Response.json({
      brief: result.brief,
      threadId: result.thread.id,
      messages: result.messages,
      created: result.created,
      nextActions:
        result.brief.payload &&
        typeof result.brief.payload === "object" &&
        "nextActions" in (result.brief.payload as object)
          ? (result.brief.payload as { nextActions?: unknown }).nextActions
          : [],
    });
  });
}

export async function POST(request: Request) {
  return GET(request);
}
