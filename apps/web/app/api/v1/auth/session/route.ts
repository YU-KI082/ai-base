import { jsonOk } from "@/app/api/v1/_lib/http";

export async function GET() {
  return jsonOk({ ok: true, service: "ai-base" });
}

export async function POST() {
  return jsonOk({ ok: true });
}
