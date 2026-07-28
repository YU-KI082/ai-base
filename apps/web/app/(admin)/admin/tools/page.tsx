import Link from "next/link";
import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale, statusLabel } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function AdminToolsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const tools = await repos.tools.findPublished();

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.tools}
      </h1>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
        {tools.map((tool) => (
          <li key={tool.id} className="card-surface" style={{ padding: "1rem" }}>
            <Link href={`/tools/${tool.slug}`}>{tool.slug}</Link>
            <div className="muted">{statusLabel(locale, tool.status)}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}
