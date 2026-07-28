import Link from "next/link";
import { createAgentRegistry } from "@ai-base/marketplace";
import { MarketplaceActions } from "./marketplace-actions";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const registry = createAgentRegistry();
  const [catalog, installations] = await Promise.all([
    registry.listCatalog(),
    registry.listInstallations(),
  ]);
  const installedByKey = new Map(
    installations.map((i) => [i.package.key, i]),
  );

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        Agent Marketplace
      </h1>
      <p className="muted">
        Discover, install, enable/disable, and update agent plugins. Visibility:
        free / paid / internal / community.
      </p>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.25rem" }}>
        {catalog.length === 0 ? (
          <p className="muted">
            No packages yet. Start agent workers to auto-register builtin plugins.
          </p>
        ) : (
          catalog.map((pkg) => {
            const latest = pkg.versions[0];
            const installation = installedByKey.get(pkg.key);
            const name =
              typeof pkg.name === "object" && pkg.name && "en" in (pkg.name as object)
                ? String((pkg.name as { en?: string }).en ?? pkg.key)
                : pkg.key;
            return (
              <article key={pkg.id} className="card-surface" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <div>
                    <Link href={`/admin/marketplace/${pkg.key}`}>
                      <strong>{name}</strong>
                    </Link>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {pkg.key} · v{latest?.version ?? "—"} · {pkg.visibility} ·{" "}
                      {pkg.listingStatus}
                      {installation
                        ? ` · ${installation.status} @ runtime ${installation.agent.version}`
                        : " · not installed"}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      perms: {pkg.permissions.map((p) => p.permission).join(", ") || "—"}
                      {" · "}
                      deps:{" "}
                      {pkg.dependencies
                        .map((d) => `${d.dependsOnKey}@${d.versionRange}`)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <MarketplaceActions
                    agentKey={pkg.key}
                    enabled={installation?.agent.status === "active"}
                    installed={Boolean(installation)}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>
    </main>
  );
}
