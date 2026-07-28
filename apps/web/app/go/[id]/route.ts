import { NextResponse } from "next/server";
import { repos } from "@ai-base/database";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const link = await repos.affiliates.findById(id);
  const fallback = new URL("/", request.url);
  if (!link || !link.isHealthy) {
    return NextResponse.redirect(fallback, 302);
  }

  await repos.analytics.track({
    name: "affiliate.click",
    properties: {
      affiliateId: link.id,
      toolId: link.toolId,
      toolSlug: link.tool.slug,
      network: link.network,
      label: link.label,
    },
  });

  return NextResponse.redirect(link.url, 302);
}
