import {
  deriveOverallStatus,
  isAffiliateStatus,
  type AffiliateStatus,
} from "@ai-base/affiliate-intel";
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
      rewardText?: string | null;
      rewardAmount?: number | null;
      cookieDays?: number | null;
      conversionTerms?: string | null;
      appliedAt?: string | null;
      approvedAt?: string | null;
      notes?: string | null;
      affiliateLinkId?: string | null;
    }>(request);

    if (body.status && !isAffiliateStatus(body.status)) {
      return jsonError("invalid status");
    }

    const lead = await repos.affiliateIntel.updateLead(id, {
      status: body.status,
      rewardText: body.rewardText,
      rewardAmount: body.rewardAmount ?? undefined,
      cookieDays: body.cookieDays,
      conversionTerms: body.conversionTerms,
      appliedAt: body.appliedAt ? new Date(body.appliedAt) : undefined,
      approvedAt: body.approvedAt ? new Date(body.approvedAt) : undefined,
      notes: body.notes,
      ...(body.affiliateLinkId
        ? { affiliateLink: { connect: { id: body.affiliateLinkId } } }
        : body.affiliateLinkId === null
          ? { affiliateLink: { disconnect: true } }
          : {}),
    });

    const intelList = await repos.affiliateIntel.listIntelligence();
    const parent = intelList.find((i) => i.id === lead.intelligenceId);
    if (parent) {
      const statuses = parent.leads.map((l) =>
        l.id === lead.id
          ? ((body.status as AffiliateStatus) ?? (l.status as AffiliateStatus))
          : (l.status as AffiliateStatus),
      );
      const overall = deriveOverallStatus(
        statuses.filter(isAffiliateStatus),
      );
      await repos.affiliateIntel.updateIntelligence(parent.id, {
        status: overall,
        hasAffiliate:
          overall === "partnered"
            ? true
            : overall === "unavailable"
              ? false
              : parent.hasAffiliate,
        lastReviewedAt: new Date(),
      });
    }

    return jsonOk({ item: lead });
  });
}
