"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary, type Locale } from "@ai-base/i18n";
import type { SelfHealingSettings } from "@ai-base/self-healing";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Attempt = {
  id: string;
  attemptNumber: number;
  action: string;
  success: boolean;
  changedFiles: string[];
  errorMessage: string | null;
  createdAt: string;
};

type Incident = {
  id: string;
  title: string;
  message: string;
  kind: string;
  severity: string;
  location: string | null;
  cause: string | null;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  requiresApproval: boolean;
  changedFiles: string[];
  testResults: unknown;
  rollbackResult: unknown;
  createdAt: string;
  attempts: Attempt[];
};

export function SelfHealingClient({
  locale,
  settings,
  canApply,
  open,
  history,
}: {
  locale: Locale;
  settings: SelfHealingSettings;
  canApply: { ok: boolean; reason?: string };
  open: Incident[];
  history: Array<{
    id: string;
    title: string;
    status: string;
    severity: string;
    attemptCount: number;
    requiresApproval: boolean;
    changedFiles: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const a = dict.admin;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/admin/self-healing", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(body.error ?? dict.common.error);
        return;
      }
      setMsg(dict.common.success);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <section className="card-surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>{a.selfHealingEmergencyStop}</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          runtime apply: {canApply.ok ? "allowed" : canApply.reason ?? "blocked"}
          {" · "}
          emergencyStop={String(settings.emergencyStop)}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() => post("emergency_stop")}
          >
            {a.selfHealingEmergencyStop}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => post("resume")}
          >
            {a.selfHealingResume}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => post("run_tick")}
          >
            {a.selfHealingRunTick}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => post("seed_featured")}
          >
            featured エラーを検知・修復
          </button>
        </div>
        {msg ? <p style={{ marginBottom: 0 }}>{msg}</p> : null}
      </section>

      <section>
        <h2>{a.selfHealingCurrentErrors}</h2>
        {open.length === 0 ? (
          <p className="muted">{dict.common.empty}</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {open.map((i) => (
              <article key={i.id} className="card-surface" style={{ padding: "1rem" }}>
                <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                  <strong>{i.title}</strong>
                  <span className="pill">{i.severity}</span>
                </header>
                <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{i.message}</p>
                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns: "8rem 1fr",
                    gap: "0.35rem 0.75rem",
                    fontSize: 13,
                  }}
                >
                  <dt>{a.selfHealingDetectedAt}</dt>
                  <dd>{new Date(i.createdAt).toLocaleString("ja-JP")}</dd>
                  <dt>{a.selfHealingLocation}</dt>
                  <dd>{i.location ?? "—"}</dd>
                  <dt>{a.selfHealingCause}</dt>
                  <dd>{i.cause ?? "—"}</dd>
                  <dt>{a.selfHealingStatus}</dt>
                  <dd>{i.status}</dd>
                  <dt>{a.selfHealingAttempts}</dt>
                  <dd>
                    {i.attemptCount} / {i.maxAttempts}
                  </dd>
                  <dt>{a.selfHealingChangedFiles}</dt>
                  <dd>{i.changedFiles.length ? i.changedFiles.join(", ") : "—"}</dd>
                  <dt>{a.selfHealingTestResults}</dt>
                  <dd>
                    <code style={{ fontSize: 11 }}>
                      {i.testResults ? JSON.stringify(i.testResults).slice(0, 240) : "—"}
                    </code>
                  </dd>
                  <dt>{a.selfHealingRollback}</dt>
                  <dd>
                    <code style={{ fontSize: 11 }}>
                      {i.rollbackResult
                        ? JSON.stringify(i.rollbackResult).slice(0, 240)
                        : "—"}
                    </code>
                  </dd>
                  <dt>{a.selfHealingNeedsApproval}</dt>
                  <dd>{i.requiresApproval ? dict.common.yes : dict.common.no}</dd>
                </dl>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {i.requiresApproval ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => post("approve", { incidentId: i.id })}
                    >
                      {a.selfHealingApprove}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => post("process", { incidentId: i.id })}
                  >
                    {a.selfHealingRunTick}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => post("ack", { incidentId: i.id })}
                  >
                    {a.selfHealingAck}
                  </button>
                </div>
                {i.attempts.length > 0 ? (
                  <details style={{ marginTop: "0.75rem" }}>
                    <summary>{a.selfHealingHistory}</summary>
                    <ul>
                      {i.attempts.map((at) => (
                        <li key={at.id}>
                          #{at.attemptNumber} {at.action}{" "}
                          {at.success ? "OK" : "NG"}{" "}
                          {at.changedFiles.join(", ")} {at.errorMessage ?? ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2>{a.selfHealingHistory}</h2>
        <ul style={{ fontSize: 13 }}>
          {history.map((h) => (
            <li key={h.id}>
              [{h.status}] {h.title} · {h.updatedAt} · attempts {h.attemptCount}
              {h.changedFiles.length ? ` · ${h.changedFiles.join(", ")}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
