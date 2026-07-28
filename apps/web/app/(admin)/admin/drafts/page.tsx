import Link from "next/link";
import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const drafts = await repos.drafts.list(sp.status);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.drafts}
      </h1>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {["pending_approval", "building", "approved", "rejected", "published"].map((status) => (
          <Link key={status} className="btn btn-ghost" href={`/admin/drafts?status=${status}`}>
            {status}
          </Link>
        ))}
      </div>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {drafts.length === 0 ? (
          <p className="muted">{dict.admin.noItems}</p>
        ) : (
          drafts.map((draft) => {
            const payload = draft.payload as { slug?: string };
            return (
              <Link
                key={draft.id}
                href={`/admin/drafts/${draft.id}`}
                className="card-surface"
                style={{ padding: "1rem", display: "block" }}
              >
                <strong>{payload.slug ?? draft.id}</strong>
                <div className="muted">
                  {draft.status} · {draft.kind}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
