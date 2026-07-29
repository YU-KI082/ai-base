import { createEvent, enqueueEvent, EventTypes } from "@ai-base/events";
import { NextResponse } from "next/server";

/**
 * Vercel Cron — SNS full-auto tick.
 * Secure with Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const event = createEvent({
    type: EventTypes.SnsAutoOpsTick,
    source: "cron/sns-auto-ops",
    dataschema: "https://ai-base.local/schemas/sns-auto-ops-tick.json",
    data: { reason: "cron" as const },
  });
  await enqueueEvent(event);

  return NextResponse.json({ ok: true, eventId: event.id });
}
