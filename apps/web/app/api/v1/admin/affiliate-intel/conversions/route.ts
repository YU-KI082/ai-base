import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function POST(request: Request) {
  return withAdmin(request, "settings.manage", async () => {
    const body = await readJson<{
      toolId?: string;
      amountUsd?: number;
      affiliateLinkId?: string;
      aspKey?: string;
      occurredAt?: string;
    }>(request);

    if (!body.toolId || body.amountUsd == null) {
      return jsonError("toolId and amountUsd required");
    }
    if (!Number.isFinite(body.amountUsd) || body.amountUsd < 0) {
      return jsonError("amountUsd must be a non-negative number");
    }

    const row = await repos.affiliateIntel.createConversion({
      toolId: body.toolId,
      amountUsd: body.amountUsd,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      affiliateLinkId: body.affiliateLinkId,
      aspKey: body.aspKey,
      source: "manual",
    });
    return jsonOk({ item: row });
  });
}
