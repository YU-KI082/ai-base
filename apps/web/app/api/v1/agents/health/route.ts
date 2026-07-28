import { repos } from "@ai-base/database";
import {
  clientKey,
  publicApiLimiter,
  tryRequireAdmin,
} from "@ai-base/auth";
import { jsonError, jsonOk } from "@/app/api/v1/_lib/http";

/**
 * Public health: liveness only.
 * Detailed agent registry requires admin auth.
 */
export async function GET(request: Request) {
  const detailed = new URL(request.url).searchParams.get("detailed") === "1";
  if (!detailed) {
    return jsonOk({ ok: true });
  }

  const limit = publicApiLimiter.check(clientKey(request, "health"));
  if (!limit.allowed) {
    return jsonError("Rate limit exceeded", 429);
  }

  const admin = await tryRequireAdmin(request);
  if (!admin) {
    return jsonError("Unauthorized", 401);
  }

  const agents = await repos.agents.list();
  return jsonOk({
    ok: true,
    agents: agents.map((a) => ({
      key: a.key,
      status: a.status,
      lastHeartbeatAt: a.lastHeartbeatAt,
      version: a.version,
    })),
  });
}
