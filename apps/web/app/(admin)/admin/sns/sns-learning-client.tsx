"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Props = {
  initial: {
    observations: Array<Record<string, unknown>>;
    patterns: Array<Record<string, unknown>>;
    experiments: Array<Record<string, unknown>>;
    recommendations: Array<Record<string, unknown>>;
    learning: Array<Record<string, unknown>>;
    improvements: Array<Record<string, unknown>>;
    posts: Array<{
      id: string;
      platform: string;
      locale: string;
      status: string;
      theme: string | null;
      hook: string | null;
      cta: string | null;
      durationSec: number | null;
      scoreTotal: number | null;
      riskFlags: string[];
      publishedAt: string | null;
      metrics: Array<Record<string, unknown>>;
    }>;
  };
};

const TABS = [
  "overview",
  "trends",
  "patterns",
  "experiments",
  "recommendations",
  "posts",
  "learning",
  "improvements",
] as const;

export function SnsLearningClient({ initial }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const ranking = useMemo(() => {
    return [...initial.posts]
      .map((p) => {
        const m = p.metrics[0];
        const conversions = Number(m?.conversions ?? 0);
        const clicks = Number(m?.affiliateClicks ?? 0);
        const plays = Number(m?.plays ?? 0);
        return { ...p, conversions, clicks, plays };
      })
      .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks || b.plays - a.plays);
  }, [initial.posts]);

  async function runLoop() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/sns", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action: "run_loop" }),
      });
      const json = (await res.json()) as { data?: { note?: string; correlationId?: string } };
      setMessage(json.data?.note ?? `Loop queued (${json.data?.correlationId ?? ""})`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patch(
    kind: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/sns/${kind}/${id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function ingestMetrics(socialPostId: string) {
    const playsRaw = window.prompt("plays (leave empty for null)");
    const clicksRaw = window.prompt("affiliateClicks (leave empty for null)");
    const conversionsRaw = window.prompt("conversions (leave empty for null)");
    const metrics: Record<string, number | null> = {
      plays: playsRaw === "" || playsRaw === null ? null : Number(playsRaw),
      affiliateClicks:
        clicksRaw === "" || clicksRaw === null ? null : Number(clicksRaw),
      conversions:
        conversionsRaw === "" || conversionsRaw === null
          ? null
          : Number(conversionsRaw),
    };
    setBusy(true);
    try {
      await fetch("/api/v1/admin/sns/metrics", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          socialPostId,
          windowHours: 24,
          source: "manual",
          metrics,
        }),
      });
      setMessage("Metrics ingest queued (real values only)");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => void runLoop()} type="button">
          Run learning loop
        </button>
        <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>
          Auto: analyze / draft / score · Manual: publish · API later: external post
        </span>
      </div>
      {message ? <p className="pill">{message}</p> : null}

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`btn ${tab === t ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
          {[
            ["Trends", initial.observations.length],
            ["Patterns", initial.patterns.length],
            ["Experiments", initial.experiments.length],
            ["Recommendations", initial.recommendations.length],
            ["Learning", initial.learning.length],
            ["Posts", initial.posts.length],
          ].map(([label, n]) => (
            <div key={String(label)} className="card-surface" style={{ padding: "1rem" }}>
              <div className="muted" style={{ fontSize: 12 }}>{label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 600 }}>{n}</div>
            </div>
          ))}
          <div className="card-surface" style={{ padding: "1rem", gridColumn: "1 / -1" }}>
            <strong>Own-post ranking (conversions → clicks → plays)</strong>
            <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
              {ranking.slice(0, 8).map((p) => (
                <li key={p.id}>
                  {p.platform}/{p.locale} · score {p.scoreTotal ?? "—"} · conv {p.conversions} · clicks {p.clicks} · plays {p.plays || "null"}
                </li>
              ))}
              {ranking.length === 0 ? <li className="muted">No posts yet</li> : null}
            </ul>
          </div>
        </div>
      )}

      {tab === "trends" && (
        <List
          empty="No trend observations"
          items={initial.observations}
          render={(o) => (
            <>
              <strong>
                {String(o.platform)}/{String(o.locale)} · {String(o.theme ?? "—")}
              </strong>
              <p className="muted" style={{ margin: "0.35rem 0" }}>
                hook={String(o.hookPattern ?? "—")} · duration={String(o.durationSec ?? "null")} · source={String(o.sourceType)} · conf={String(o.confidence)} · plays={String(o.plays ?? "null")}
              </p>
              <Actions
                busy={busy}
                onInvalidate={() => void patch("observations", String(o.id), { status: "invalidated" })}
                onActivate={() => void patch("observations", String(o.id), { status: "active" })}
              />
            </>
          )}
        />
      )}

      {tab === "patterns" && (
        <List
          empty="No patterns"
          items={initial.patterns}
          render={(p) => (
            <>
              <strong>{String(p.title)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(p.summary)}</p>
              <p className="muted" style={{ margin: 0 }}>
                n={String(p.sampleSize)} · conf={Number(p.confidence).toFixed(2)} · {String(p.platform)}/{String(p.locale)} · {String(p.status)}
              </p>
              <Actions
                busy={busy}
                onInvalidate={() => void patch("patterns", String(p.id), { status: "invalidated" })}
                onActivate={() => void patch("patterns", String(p.id), { status: "active" })}
              />
            </>
          )}
        />
      )}

      {tab === "experiments" && (
        <List
          empty="No experiments"
          items={initial.experiments}
          render={(e) => (
            <>
              <strong>{String(e.title)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(e.hypothesis)}</p>
              <p className="muted">
                change={String(e.changeFactor)} · metric={String(e.successMetric)} · {String(e.status)}
              </p>
              <Actions
                busy={busy}
                onInvalidate={() => void patch("experiments", String(e.id), { status: "aborted" })}
                onActivate={() => void patch("experiments", String(e.id), { status: "running" })}
                activateLabel="Mark running"
                invalidateLabel="Abort"
              />
            </>
          )}
        />
      )}

      {tab === "recommendations" && (
        <List
          empty="No recommendations"
          items={initial.recommendations}
          render={(r) => (
            <>
              <strong>
                {String(r.theme)} · pred {String(r.predictedScore ?? "—")}
              </strong>
              <p style={{ margin: "0.35rem 0" }}>{String(r.rationale)}</p>
              <p className="muted">
                {String(r.platform)}/{String(r.locale)} · hook={String(r.recommendedHook)} · CTA={String(r.cta)} · goal={String(r.goal)}
              </p>
              <Actions
                busy={busy}
                onInvalidate={() => void patch("recommendations", String(r.id), { status: "rejected" })}
                onActivate={() => void patch("recommendations", String(r.id), { status: "accepted" })}
                activateLabel="Accept"
                invalidateLabel="Reject"
              />
            </>
          )}
        />
      )}

      {tab === "posts" && (
        <List
          empty="No social posts"
          items={initial.posts}
          render={(p) => (
            <>
              <strong>
                {p.platform}/{p.locale} · {p.status} · score {p.scoreTotal ?? "—"}
              </strong>
              {p.riskFlags.length ? (
                <p style={{ color: "var(--danger, #b42318)", margin: "0.35rem 0" }}>
                  risk: {p.riskFlags.join(", ")}
                </p>
              ) : null}
              <p className="muted" style={{ margin: "0.35rem 0" }}>
                theme={p.theme ?? "—"} · hook={p.hook ?? "—"} · cta={p.cta ?? "—"}
              </p>
              <button
                className="btn btn-ghost"
                disabled={busy}
                type="button"
                onClick={() => void ingestMetrics(p.id)}
              >
                Ingest real metrics
              </button>
            </>
          )}
        />
      )}

      {tab === "learning" && (
        <List
          empty="No learning records"
          items={initial.learning}
          render={(l) => (
            <>
              <strong>
                [{String(l.kind)}] {String(l.title)}
              </strong>
              <p style={{ margin: "0.35rem 0" }}>{String(l.content)}</p>
              <Actions
                busy={busy}
                onInvalidate={() => void patch("learning", String(l.id), { status: "invalidated" })}
                onActivate={() => void patch("learning", String(l.id), { status: "active" })}
              />
            </>
          )}
        />
      )}

      {tab === "improvements" && (
        <List
          empty="No improvement logs"
          items={initial.improvements}
          render={(i) => (
            <>
              <strong>{String(i.agentKey)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(i.summary)}</p>
              <p className="muted" style={{ margin: 0 }}>{String(i.createdAt)}</p>
            </>
          )}
        />
      )}
    </div>
  );
}

function List({
  items,
  empty,
  render,
}: {
  items: Array<Record<string, unknown>> | Props["initial"]["posts"];
  empty: string;
  render: (item: never) => ReactNode;
}) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
      {items.map((item) => (
        <li key={String((item as { id: string }).id)} className="card-surface" style={{ padding: "1rem" }}>
          {render(item as never)}
        </li>
      ))}
    </ul>
  );
}

function Actions({
  busy,
  onInvalidate,
  onActivate,
  activateLabel = "Activate",
  invalidateLabel = "Invalidate",
}: {
  busy: boolean;
  onInvalidate: () => void;
  onActivate: () => void;
  activateLabel?: string;
  invalidateLabel?: string;
}) {
  return (
    <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem" }}>
      <button className="btn btn-ghost" disabled={busy} type="button" onClick={onActivate}>
        {activateLabel}
      </button>
      <button className="btn btn-danger" disabled={busy} type="button" onClick={onInvalidate}>
        {invalidateLabel}
      </button>
    </div>
  );
}
