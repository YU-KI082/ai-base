import { repos } from "@ai-base/database";
import Link from "next/link";
import { cookies } from "next/headers";
import { formatDateTime, getDictionary, resolveLocale } from "@ai-base/i18n";
import { AgentControls } from "./agent-controls";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const agents = await repos.agents.list();

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        {dict.admin.agents}
      </h1>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {agents.length === 0 ? (
          <p className="muted">{dict.admin.agentsEmpty}</p>
        ) : (
          agents.map((agent) => (
            <article key={agent.id} className="card-surface" style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <div>
                  <Link href={`/ops/agents/${agent.key}`}>
                    <strong>{agent.key}</strong>
                  </Link>
                  <div className="muted">
                    v{agent.version} · {agent.status}
                    {agent.lastHeartbeatAt
                      ? ` · ${dict.admin.heartbeat} ${formatDateTime(agent.lastHeartbeatAt, locale)}`
                      : ""}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    {dict.admin.subscribeLabel}: {agent.subscribe.join(", ") || "—"}
                  </div>
                </div>
                <AgentControls
                  agentKey={agent.key}
                  enabled={agent.status === "active"}
                  labels={{
                    enable: dict.admin.enable,
                    disable: dict.admin.disable,
                  }}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  );
}
