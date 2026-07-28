import { repos } from "@ai-base/database";
import {
  clientKey,
  publicApiLimiter,
} from "@ai-base/auth";
import { cachedJson } from "@ai-base/cache";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

export async function GET(request: Request) {
  const limit = publicApiLimiter.check(clientKey(request, "tools"));
  if (!limit.allowed) {
    return jsonError("Rate limit exceeded", 429);
  }

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "ja";
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);
  const categoryKey = searchParams.get("category") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const ttl = Number(process.env.CACHE_TTL_TOOLS_SECONDS ?? 60);
  const tools = await cachedJson(
    `tools:published:${locale}:${take}:${skip}:${categoryKey ?? ""}:${q ?? ""}`,
    ttl,
    () =>
      repos.tools.findPublished(locale, {
        take,
        skip,
        categoryKey,
        q,
      }),
  );

  return jsonOk(
    { items: tools, take, skip },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`,
      },
    },
  );
}
