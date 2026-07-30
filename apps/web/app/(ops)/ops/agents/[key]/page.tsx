import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { repos } from "@ai-base/database";
import { formatDateTime, getDictionary, resolveLocale } from "@ai-base/i18n";

export const dynamic = "force-dynamic";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const agents = await repos.agents.list();
  const agent = agents.find((a) => a.key === key);
  if (!agent) notFound();
  const runs = await repos.agentRuns.list({ agentKey: key, take: 20 });

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {agent.key}
      </h1>
      <p className="muted">
        v{agent.version} · {agent.status}
      </p>
      <section className="card-surface" style={{ padding: "1rem" }}>
        <h2>{dict.admin.config}</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(agent.config, null, 2)}</pre>
      </section>
      <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
        <h2>{dict.admin.recentRuns}</h2>
        <ul>
          {runs.length === 0 ? (
            <li className="muted">{dict.admin.noItems}</li>
          ) : (
            runs.map((run) => (
              <li key={run.id}>
                {run.status} · {formatDateTime(run.createdAt, locale)}
                {run.error ? ` · ${run.error}` : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
