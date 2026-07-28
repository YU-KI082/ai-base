import Link from "next/link";
import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const workflows = await repos.workflows.list(50);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.workflows}
      </h1>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {workflows.map((w) => (
          <Link
            key={w.id}
            href={`/admin/workflows/${w.id}`}
            className="card-surface"
            style={{ padding: "1rem", display: "block" }}
          >
            <strong>{w.type}</strong>
            <div className="muted">
              {w.state} · {w.correlationId}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
