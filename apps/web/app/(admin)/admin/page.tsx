import Link from "next/link";
import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [pending, failing, agents, workflows] = await Promise.all([
    repos.drafts.list("pending_approval"),
    repos.agentRuns.list({ status: "failed", take: 5 }),
    repos.agents.list(),
    repos.workflows.list(5),
  ]);

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.dashboard}
      </h1>
      <div className="grid-2">
        <section className="card-surface" style={{ padding: "1rem" }}>
          <h2>{dict.admin.pendingApprovals}</h2>
          {pending.length === 0 ? (
            <p className="muted">{dict.admin.noItems}</p>
          ) : (
            <ul>
              {pending.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/drafts/${d.id}`}>{d.id}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-surface" style={{ padding: "1rem" }}>
          <h2>{dict.admin.agents}</h2>
          <p>
            {agents.filter((a) => a.status === "active").length} active / {agents.length}
          </p>
          <h2>{dict.admin.workflows}</h2>
          <ul>
            {workflows.map((w) => (
              <li key={w.id}>
                <Link href={`/admin/workflows/${w.id}`}>
                  {w.type} — {w.state}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>Failed runs</h2>
        {failing.length === 0 ? (
          <p className="muted">{dict.admin.noItems}</p>
        ) : (
          <ul>
            {failing.map((run) => (
              <li key={run.id}>
                {run.agentKey}: {run.error}
              </li>
            ))}
          </ul>
        )}
      </section>
      <div style={{ marginTop: "1.25rem" }}>
        <Link className="btn btn-primary" href="/admin/ingest">
          Manual ingest
        </Link>
      </div>
    </main>
  );
}
