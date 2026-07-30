"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { getDictionary, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Props = {
  locale: Locale;
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

export function SnsLearningClient({ locale, initial }: Props) {
  const router = useRouter();
  const a = getDictionary(locale).admin;
  const c = getDictionary(locale).common;
  const [tab, setTab] = useState<string>("overview");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const TABS = [
    { id: "overview", label: a.tabOverview },
    { id: "trends", label: a.tabTrends },
    { id: "patterns", label: a.tabPatterns },
    { id: "experiments", label: a.tabExperiments },
    { id: "recommendations", label: a.tabRecommendations },
    { id: "posts", label: a.tabPosts },
    { id: "learning", label: a.tabLearning },
    { id: "improvements", label: a.tabImprovements },
  ] as const;

  const ranking = useMemo(() => {
    return [...initial.posts]
      .map((p) => {
        const m = p.metrics[0];
        const conversions = Number(m?.conversions ?? 0);
        const clicks = Number(m?.affiliateClicks ?? 0);
        const plays = Number(m?.plays ?? 0);
        return { ...p, conversions, clicks, plays };
      })
      .sort(
        (x, y) =>
          y.conversions - x.conversions || y.clicks - x.clicks || y.plays - x.plays,
      );
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
      const json = (await res.json()) as {
        data?: { note?: string; correlationId?: string };
      };
      setMessage(json.data?.note ?? c.success);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function patch(kind: string, id: string, body: Record<string, unknown>) {
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
    const playsRaw = window.prompt(a.promptPlays);
    const clicksRaw = window.prompt(a.promptAffiliateClicks);
    const conversionsRaw = window.prompt(a.promptConversions);
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
      setMessage(c.success);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void runLoop()}
          type="button"
        >
          {a.runLearningLoop}
        </button>
        <span className="muted" style={{ alignSelf: "center", fontSize: 13 }}>
          {a.automationHint}
        </span>
      </div>
      {message ? <p className="pill">{message}</p> : null}

      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          }}
        >
          {[
            [a.trends, initial.observations.length],
            [a.patterns, initial.patterns.length],
            [a.experiments, initial.experiments.length],
            [a.recommendations, initial.recommendations.length],
            [a.learning, initial.learning.length],
            [a.posts, initial.posts.length],
          ].map(([label, n]) => (
            <div key={String(label)} className="card-surface" style={{ padding: "1rem" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {label}
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 600 }}>{n}</div>
            </div>
          ))}
          <div className="card-surface" style={{ padding: "1rem", gridColumn: "1 / -1" }}>
            <strong>{a.ownPostRanking}</strong>
            <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.1rem" }}>
              {ranking.slice(0, 8).map((p) => (
                <li key={p.id}>
                  {p.platform}/{p.locale} · {a.score} {p.scoreTotal ?? "—"} · CV{" "}
                  {p.conversions} · {a.clicks} {p.clicks} · {a.plays}{" "}
                  {p.plays || "null"}
                </li>
              ))}
              {ranking.length === 0 ? <li className="muted">{c.empty}</li> : null}
            </ul>
          </div>
        </div>
      )}

      {tab === "trends" && (
        <List
          empty={a.emptyTrends}
          items={initial.observations}
          render={(o) => (
            <>
              <strong>
                {String(o.platform)}/{String(o.locale)} · {String(o.theme ?? "—")}
              </strong>
              <Actions
                busy={busy}
                activateLabel={a.activate}
                invalidateLabel={a.invalidate}
                onInvalidate={() =>
                  void patch("observations", String(o.id), { status: "invalidated" })
                }
                onActivate={() =>
                  void patch("observations", String(o.id), { status: "active" })
                }
              />
            </>
          )}
        />
      )}
      {tab === "patterns" && (
        <List
          empty={a.emptyPatterns}
          items={initial.patterns}
          render={(p) => (
            <>
              <strong>{String(p.title)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(p.summary)}</p>
              <Actions
                busy={busy}
                activateLabel={a.activate}
                invalidateLabel={a.invalidate}
                onInvalidate={() =>
                  void patch("patterns", String(p.id), { status: "invalidated" })
                }
                onActivate={() =>
                  void patch("patterns", String(p.id), { status: "active" })
                }
              />
            </>
          )}
        />
      )}
      {tab === "experiments" && (
        <List
          empty={a.emptyExperiments}
          items={initial.experiments}
          render={(e) => (
            <>
              <strong>{String(e.title)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(e.hypothesis)}</p>
              <Actions
                busy={busy}
                activateLabel={a.markRunning}
                invalidateLabel={a.abort}
                onInvalidate={() =>
                  void patch("experiments", String(e.id), { status: "aborted" })
                }
                onActivate={() =>
                  void patch("experiments", String(e.id), { status: "running" })
                }
              />
            </>
          )}
        />
      )}
      {tab === "recommendations" && (
        <List
          empty={a.emptyRecommendations}
          items={initial.recommendations}
          render={(r) => (
            <>
              <strong>
                {String(r.theme)} · {a.predictedScore}{" "}
                {String(r.predictedScore ?? "—")}
              </strong>
              <p style={{ margin: "0.35rem 0" }}>{String(r.rationale)}</p>
              <Actions
                busy={busy}
                activateLabel={a.accept}
                invalidateLabel={c.reject}
                onInvalidate={() =>
                  void patch("recommendations", String(r.id), { status: "rejected" })
                }
                onActivate={() =>
                  void patch("recommendations", String(r.id), { status: "accepted" })
                }
              />
            </>
          )}
        />
      )}
      {tab === "posts" && (
        <List
          empty={a.emptyPosts}
          items={initial.posts}
          render={(p) => (
            <>
              <strong>
                {p.platform}/{p.locale} · {p.status} · {a.score} {p.scoreTotal ?? "—"}
              </strong>
              <button
                className="btn btn-ghost"
                disabled={busy}
                type="button"
                onClick={() => void ingestMetrics(p.id)}
              >
                {a.ingestMetrics}
              </button>
            </>
          )}
        />
      )}
      {tab === "learning" && (
        <List
          empty={a.emptyLearning}
          items={initial.learning}
          render={(l) => (
            <>
              <strong>
                [{String(l.kind)}] {String(l.title)}
              </strong>
              <p style={{ margin: "0.35rem 0" }}>{String(l.content)}</p>
              <Actions
                busy={busy}
                activateLabel={a.activate}
                invalidateLabel={a.invalidate}
                onInvalidate={() =>
                  void patch("learning", String(l.id), { status: "invalidated" })
                }
                onActivate={() =>
                  void patch("learning", String(l.id), { status: "active" })
                }
              />
            </>
          )}
        />
      )}
      {tab === "improvements" && (
        <List
          empty={a.emptyImprovements}
          items={initial.improvements}
          render={(i) => (
            <>
              <strong>{String(i.agentKey)}</strong>
              <p style={{ margin: "0.35rem 0" }}>{String(i.summary)}</p>
            </>
          )}
        />
      )}
    </div>
  );
}

function List<T extends { id: string } | Record<string, unknown>>({
  items,
  empty,
  render,
}: {
  items: T[];
  empty: string;
  render: (item: T) => ReactNode;
}) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
      {items.map((item) => (
        <li
          key={String((item as { id: string }).id)}
          className="card-surface"
          style={{ padding: "1rem" }}
        >
          {render(item)}
        </li>
      ))}
    </ul>
  );
}

function Actions({
  busy,
  onInvalidate,
  onActivate,
  activateLabel,
  invalidateLabel,
}: {
  busy: boolean;
  onInvalidate: () => void;
  onActivate: () => void;
  activateLabel: string;
  invalidateLabel: string;
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
