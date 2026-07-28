import Link from "next/link";
import { notFound } from "next/navigation";
import { createAgentRegistry } from "@ai-base/marketplace";

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const registry = createAgentRegistry();
  const pkg = await registry.getPackage(key);
  if (!pkg) notFound();

  const name =
    typeof pkg.name === "object" && pkg.name && "en" in (pkg.name as object)
      ? String((pkg.name as { en?: string }).en ?? pkg.key)
      : pkg.key;

  return (
    <main>
      <Link className="muted" href="/admin/marketplace">
        ← Marketplace
      </Link>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>{name}</h1>
      <p className="muted">
        {pkg.key} · {pkg.visibility} · {pkg.listingStatus}
      </p>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>Permissions</h2>
        <ul>
          {pkg.permissions.length === 0 ? (
            <li className="muted">None declared</li>
          ) : (
            pkg.permissions.map((p) => <li key={p.id}>{p.permission}</li>)
          )}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>Dependencies</h2>
        <ul>
          {pkg.dependencies.length === 0 ? (
            <li className="muted">None</li>
          ) : (
            pkg.dependencies.map((d) => (
              <li key={d.id}>
                {d.dependsOnKey} @ {d.versionRange}
                {d.optional ? " (optional)" : ""}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>Versions</h2>
        <ul>
          {pkg.versions.map((v) => (
            <li key={v.id}>
              v{v.version}
              {v.isLatest ? " (latest)" : ""} · {v.publishedAt.toISOString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>Latest manifest</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(pkg.versions[0]?.manifest ?? {}, null, 2)}
        </pre>
      </section>
    </main>
  );
}
