"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  nextPath,
  labels,
}: {
  nextPath: string;
  labels: {
    secret: string;
    submit: string;
    error: string;
  };
}) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? labels.error);
        return;
      }
      router.replace(nextPath || "/ops");
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="card-surface" style={{ padding: "1.15rem", maxWidth: 420 }}>
      <label className="muted" style={{ display: "block" }}>
        {labels.secret}
        <input
          type="password"
          autoComplete="current-password"
          required
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            marginBottom: 12,
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.7rem 0.85rem",
          }}
        />
      </label>
      <button className="btn btn-primary" disabled={busy} type="submit">
        {labels.submit}
      </button>
      {error ? <p style={{ color: "var(--danger)", marginBottom: 0 }}>{error}</p> : null}
    </form>
  );
}
