import { repos } from "@ai-base/database";
import { AffiliateAdminClient } from "./affiliate-admin-client";

export default async function AffiliateAdminPage() {
  const [links, tools] = await Promise.all([
    repos.affiliates.list(),
    repos.tools.findPublished("en", { take: 200 }),
  ]);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">Monetization</p>
          <h1 className="page-title">Affiliate links</h1>
          <p className="page-subtitle">
            Public CTAs use <code>/go/[id]</code> with click tracking into analytics.
          </p>
        </div>
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <AffiliateAdminClient
          initialLinks={links.map((l) => ({
            id: l.id,
            toolId: l.toolId,
            toolSlug: l.tool.slug,
            label: l.label,
            url: l.url,
            network: l.network,
            commission: l.commission,
            priority: l.priority,
            isHealthy: l.isHealthy,
          }))}
          tools={tools.map((t) => ({
            id: t.id,
            slug: t.slug,
            name: t.translations[0]?.name ?? t.slug,
          }))}
        />
      </div>
    </main>
  );
}
