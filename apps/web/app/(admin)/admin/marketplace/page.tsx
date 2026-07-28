import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { createAgentRegistry } from "@ai-base/marketplace";
import { MarketplaceActions } from "./marketplace-actions";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
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
        {dict.admin.marketplace}
      </h1>
      <p className="muted">{dict.admin.marketplaceSubtitle}</p>

      <div style={{ display: "grid", gap: "0.75rem", marginTop: "1.25rem" }}>
        {catalog.length === 0 ? (
          <p className="muted">{dict.admin.marketplaceEmpty}</p>
        ) : (
          catalog.map((pkg) => {
            const latest = pkg.versions[0];
            const installation = installedByKey.get(pkg.key);
            const name =
              typeof pkg.name === "object" && pkg.name && "en" in (pkg.name as object)
                ? String(
                    (pkg.name as { ja?: string; en?: string })[locale] ??
                      (pkg.name as { en?: string }).en ??
                      pkg.key,
                  )
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
                        : ` · ${dict.admin.notInstalled}`}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {dict.admin.permissionsShort}:{" "}
                      {pkg.permissions.map((p) => p.permission).join(", ") || "—"}
                      {" · "}
                      {dict.admin.depsShort}:{" "}
                      {pkg.dependencies
                        .map((d) => `${d.dependsOnKey}@${d.versionRange}`)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <MarketplaceActions
                    agentKey={pkg.key}
                    enabled={installation?.agent.status === "active"}
                    installed={Boolean(installation)}
                    labels={{
                      enable: dict.admin.enable,
                      disable: dict.admin.disable,
                      update: dict.admin.update,
                      registerViaWorker: dict.admin.registerViaWorker,
                    }}
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
