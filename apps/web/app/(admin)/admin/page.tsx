import Link from "next/link";
import { repos } from "@ai-base/database";
import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [pending, failing, agents, workflows, tools, affiliates, social] =
    await Promise.all([
      repos.drafts.list("pending_approval"),
      repos.agentRuns.list({ status: "failed", take: 5 }),
      repos.agents.list(),
      repos.workflows.list(5),
      repos.tools.findPublished("en", { take: 200 }),
      repos.affiliates.list(),
      repos.socialPosts.list("draft"),
    ]);

  const cards = [
    {
      label: dict.admin.pendingApprovals,
      value: String(pending.length),
      href: "/admin/drafts",
    },
    {
      label: dict.admin.tools,
      value: String(tools.length),
      href: "/admin/tools",
    },
    {
      label: "Affiliate links",
      value: String(affiliates.length),
      href: "/admin/affiliate",
    },
    {
      label: "Social drafts",
      value: String(social.length),
      href: "/admin/social",
    },
  ];

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">Ops</p>
          <h1 className="page-title">{dict.admin.dashboard}</h1>
          <p className="page-subtitle">
            {locale === "ja"
              ? "承認・公開・アフィリエイト・SNS下書きをここから運用します。"
              : "Approve, publish, manage affiliates, and review social drafts."}
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/ingest">
          Manual ingest
        </Link>
      </div>

      <div className="grid-2" style={{ marginTop: "1.5rem", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card-surface"
            style={{ padding: "1.1rem 1.15rem", display: "block" }}
          >
            <div className="muted" style={{ fontSize: 13 }}>
              {card.label}
            </div>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 4,
              }}
            >
              {card.value}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <section className="card-surface" style={{ padding: "1.15rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{dict.admin.pendingApprovals}</h2>
          {pending.length === 0 ? (
            <p className="muted">{dict.admin.noItems}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {pending.map((d) => (
                <li key={d.id}>
                  <Link href={`/admin/drafts/${d.id}`}>{d.id}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card-surface" style={{ padding: "1.15rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>{dict.admin.agents}</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {agents.filter((a) => a.status === "active").length} active / {agents.length}
          </p>
          <h2 style={{ fontSize: "1.05rem" }}>{dict.admin.workflows}</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {workflows.length === 0 ? (
              <li className="muted">{dict.admin.noItems}</li>
            ) : (
              workflows.map((w) => (
                <li key={w.id}>
                  <Link href={`/admin/workflows/${w.id}`}>
                    {w.type} — {w.state}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="card-surface" style={{ padding: "1.15rem", marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Failed runs</h2>
        {failing.length === 0 ? (
          <p className="muted">{dict.admin.noItems}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {failing.map((run) => (
              <li key={run.id}>
                {run.agentKey}: {run.error}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
