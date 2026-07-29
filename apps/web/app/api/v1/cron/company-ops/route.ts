import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import { NextResponse } from "next/server";

/**
 * Daily company tick — research → SEO → SNS → analytics → improve.
 * Hobby plan: once per day.
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
    type: EventTypes.CompanyOpsTick,
    source: "cron/company-ops",
    dataschema: "https://ai-base.local/schemas/company.ops.tick.v1.json",
    correlationid: `cron-company-${Date.now()}`,
    data: { reason: "cron" as const },
  });
  await enqueueEvent(event);

  return NextResponse.json({ ok: true, eventId: event.id });
}
