import { NextResponse } from "next/server";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonOk } from "@/app/api/v1/_lib/http";
import { listConnectionSummaries } from "@ai-base/sns-oauth";

export async function GET(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const items = await listConnectionSummaries();
    return jsonOk({ items });
  });
}
