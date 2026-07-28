import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { createAgentRegistry } from "@ai-base/marketplace";

export const dynamic = "force-dynamic";

export default async function MarketplaceDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const registry = createAgentRegistry();
  const pkg = await registry.getPackage(key);
  if (!pkg) notFound();

  const name =
    typeof pkg.name === "object" && pkg.name && "en" in (pkg.name as object)
      ? String(
          (pkg.name as { ja?: string; en?: string })[locale] ??
            (pkg.name as { en?: string }).en ??
            pkg.key,
        )
      : pkg.key;

  return (
    <main>
      <Link className="muted" href="/admin/marketplace">
        ← {dict.admin.marketplace}
      </Link>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif" }}>{name}</h1>
      <p className="muted">
        {pkg.key} · {pkg.visibility} · {pkg.listingStatus}
      </p>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>{dict.admin.permissions}</h2>
        <ul>
          {pkg.permissions.length === 0 ? (
            <li className="muted">{dict.admin.noneDeclared}</li>
          ) : (
            pkg.permissions.map((p) => <li key={p.id}>{p.permission}</li>)
          )}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>{dict.admin.dependencies}</h2>
        <ul>
          {pkg.dependencies.length === 0 ? (
            <li className="muted">{dict.admin.none}</li>
          ) : (
            pkg.dependencies.map((d) => (
              <li key={d.id}>
                {d.dependsOnKey} @ {d.versionRange}
                {d.optional ? ` (${dict.admin.optional})` : ""}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>{dict.admin.versions}</h2>
        <ul>
          {pkg.versions.map((v) => (
            <li key={v.id}>
              v{v.version}
              {v.isLatest ? ` (${dict.admin.latest})` : ""} · {v.publishedAt.toISOString()}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>{dict.admin.latestManifest}</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>
          {JSON.stringify(pkg.versions[0]?.manifest ?? {}, null, 2)}
        </pre>
      </section>
    </main>
  );
}
