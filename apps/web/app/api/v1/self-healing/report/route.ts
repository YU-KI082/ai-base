import { EventTypes, createEvent, enqueueEvent } from "@ai-base/events";
import { reportError } from "@ai-base/self-healing";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

/**
 * Public-ish error intake for Next.js error boundaries / clients.
 * Does not apply patches — only records + enqueues healing tick.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    message?: string;
    title?: string;
    kind?: string;
    location?: string;
    stack?: string;
    digest?: string;
  } | null;

  if (!body?.message) {
    return jsonError("message required", 400);
  }

  const reported = await reportError({
    title: body.title,
    message: body.message,
    kind: body.kind ?? "runtime",
    location: body.location,
    stack: body.stack,
    metadata: { digest: body.digest, source: "web-error-intake" },
  });

  await enqueueEvent(
    createEvent({
      type: EventTypes.SelfHealingErrorReported,
      source: "web:error-boundary",
      dataschema: "https://ai-base.local/schemas/self-healing-error.json",
      correlationid: `err-${reported.incident.id}`,
      data: {
        title: body.title,
        message: body.message,
        kind: body.kind,
        location: body.location,
        stack: body.stack,
      },
    }),
  );

  return jsonOk({ incidentId: reported.incident.id });
}
