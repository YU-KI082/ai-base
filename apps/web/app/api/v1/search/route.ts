import { repos } from "@ai-base/database";
import {
  clientKey,
  publicApiLimiter,
} from "@ai-base/auth";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  const limit = publicApiLimiter.check(clientKey(request, "search"));
  if (!limit.allowed) return jsonError("Rate limit exceeded", 429);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const locale = searchParams.get("locale") === "en" ? "en" : "ja";
  if (!q) return jsonOk({ items: [] });

  const items = await repos.tools.findPublished(locale, { q, take: 20 });
  return jsonOk({ items });
}
