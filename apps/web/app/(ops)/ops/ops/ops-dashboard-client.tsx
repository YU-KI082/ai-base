"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getDictionary, type Locale } from "@ai-base/i18n";
import type { AutoOpsSettings } from "@ai-base/sns-auto-ops";
import { adminMutationHeaders } from "@/lib/admin-fetch";

export function OpsDashboardClient({
  locale,
  settings,
  alerts,
}: {
  locale: Locale;
  settings: AutoOpsSettings;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    kind: string;
    createdAt: string;
  }>;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(settings.mode);
  const [daily, setDaily] = useState(settings.dailyPostLimit);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/v1/admin/ops", {
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

  async function saveSettings() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/admin/ops", {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          mode,
          dailyPostLimit: daily,
          emergencyStop: mode === "full_auto" ? false : settings.emergencyStop,
          ramp: {
            ...settings.ramp,
            enabled: true,
            startDailyLimit: 1,
            testDays: 7,
            afterTestDailyLimit: Math.max(2, daily),
          },
        }),
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
    <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
      {msg ? <p className="muted">{msg}</p> : null}

      {alerts.length > 0 ? (
        <section className="card-surface" style={{ padding: "1.15rem" }}>
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
            {dict.admin.opsCriticalAlerts}
          </h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {alerts.map((a) => (
              <li key={a.id} style={{ marginBottom: "0.65rem" }}>
                <strong>{a.title}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {a.message}
                </div>
                <button
                  className="btn btn-ghost"
                  disabled={busy}
                  type="button"
                  style={{ marginTop: 4 }}
                  onClick={() => void post("ack_alert", { alertId: a.id })}
                >
                  {dict.admin.opsAckAlert}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card-surface" style={{ padding: "1.15rem" }}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>
          {dict.admin.opsSafety}
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button
            className="btn btn-danger"
            disabled={busy}
            type="button"
            onClick={() => void post("emergency_stop")}
          >
            {dict.admin.opsEmergencyStop}
          </button>
          <button
            className="btn btn-primary"
            disabled={busy}
            type="button"
            onClick={() => void post("resume")}
          >
            {dict.admin.opsResume}
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy}
            type="button"
            onClick={() => void post("run_tick")}
          >
            {dict.admin.opsRunTick}
          </button>
        </div>

        <label className="muted" style={{ display: "block", marginBottom: 8 }}>
          {dict.admin.opsMode}
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as AutoOpsSettings["mode"])}
            style={{
              display: "block",
              marginTop: 6,
              width: "100%",
              maxWidth: 360,
              padding: "0.6rem 0.75rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          >
            <option value="draft_only">{dict.admin.opsModeDraftOnly}</option>
            <option value="approval">{dict.admin.opsModeApproval}</option>
            <option value="full_auto">{dict.admin.opsModeFullAuto}</option>
          </select>
        </label>

        <label className="muted" style={{ display: "block", marginBottom: 12 }}>
          {dict.admin.opsDailyLimit}
          <input
            type="number"
            min={0}
            max={20}
            value={daily}
            onChange={(e) => setDaily(Number(e.target.value))}
            style={{
              display: "block",
              marginTop: 6,
              width: 120,
              padding: "0.6rem 0.75rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
            }}
          />
        </label>

        <p className="muted" style={{ fontSize: 13 }}>
          {dict.admin.opsRampHint}
        </p>

        <button
          className="btn btn-primary"
          disabled={busy}
          type="button"
          onClick={() => void saveSettings()}
        >
          {dict.common.save}
        </button>
      </section>
    </div>
  );
}
