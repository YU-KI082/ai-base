import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { formatDateTime, getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const logs = await repos.logs.list(100);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.logs}
      </h1>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {logs.map((log) => (
          <article key={log.id} className="card-surface" style={{ padding: "0.75rem 1rem" }}>
            <div className="muted" style={{ fontSize: 12 }}>
              {formatDateTime(log.createdAt, locale)} · {log.level} · {log.source}
            </div>
            <div>{log.message}</div>
          </article>
        ))}
      </div>
    </main>
  );
}
