import { isAffiliateStatus } from "@ai-base/affiliate-intel";
import { repos } from "@ai-base/database";
import { withAdmin } from "@/app/api/v1/_lib/admin";
import { jsonError, jsonOk, readJson } from "@/app/api/v1/_lib/http";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withAdmin(request, "settings.manage", async () => {
    const { id } = await context.params;
    const body = await readJson<{
      status?: string;
      hasAffiliate?: boolean | null;
      notes?: string;
    }>(request);

    if (body.status && !isAffiliateStatus(body.status)) {
      return jsonError("invalid status");
    }

    const row = await repos.affiliateIntel.updateIntelligence(id, {
      status: body.status,
      hasAffiliate: body.hasAffiliate,
      notes: body.notes,
      lastReviewedAt: new Date(),
    });
    return jsonOk({ item: row });
  });
}
