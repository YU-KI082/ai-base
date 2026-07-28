import { repos } from "@ai-base/database";
import { AffiliateAdminClient } from "./affiliate-admin-client";

export default async function AffiliateAdminPage() {
  const [links, tools] = await Promise.all([
    repos.affiliates.list(),
    repos.tools.findPublished("en", { take: 200 }),
  ]);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        Affiliate links
      </h1>
      <p className="muted">
        Manage outbound partner links. Public CTAs use <code>/go/[id]</code> with click tracking.
      </p>
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
    </main>
  );
}
