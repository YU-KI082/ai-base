"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type LinkRow = {
  id: string;
  toolId: string;
  toolSlug: string;
  label: string;
  url: string;
  network: string | null;
  commission: string | null;
  priority: number;
  isHealthy: boolean;
};

export function AffiliateAdminClient({
  initialLinks,
  tools,
}: {
  initialLinks: LinkRow[];
  tools: Array<{ id: string; slug: string; name: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolId, setToolId] = useState(tools[0]?.id ?? "");
  const [label, setLabel] = useState("Visit website");
  const [url, setUrl] = useState("https://");
  const [network, setNetwork] = useState("");
  const [priority, setPriority] = useState(10);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/affiliates", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          toolId,
          label,
          url,
          network: network || undefined,
          priority,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleHealthy(row: LinkRow) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/affiliates/${row.id}`, {
        method: "PATCH",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ isHealthy: !row.isHealthy }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/affiliates/${id}`, {
        method: "DELETE",
        headers: adminMutationHeaders(),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <form onSubmit={(e) => void create(e)} className="card-surface" style={{ padding: "1rem", maxWidth: 640 }}>
        <h2 style={{ marginTop: 0 }}>Add link</h2>
        <label className="muted">
          Tool
          <select
            value={toolId}
            onChange={(e) => setToolId(e.target.value)}
            required
            style={inputStyle}
          >
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>
        </label>
        <label className="muted">
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} required style={inputStyle} />
        </label>
        <label className="muted">
          URL
          <input value={url} onChange={(e) => setUrl(e.target.value)} required type="url" style={inputStyle} />
        </label>
        <label className="muted">
          Network
          <input value={network} onChange={(e) => setNetwork(e.target.value)} style={inputStyle} />
        </label>
        <label className="muted">
          Priority
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={inputStyle}
          />
        </label>
        <button className="btn btn-primary" disabled={busy || !toolId} type="submit">
          Create
        </button>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      </form>

      <section className="card-surface" style={{ padding: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Links ({initialLinks.length})</h2>
        {initialLinks.length === 0 ? (
          <p className="muted">No affiliate links yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.65rem" }}>
            {initialLinks.map((row) => (
              <li
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.65rem",
                }}
              >
                <div>
                  <strong>{row.label}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {row.toolSlug} · priority {row.priority}
                    {row.network ? ` · ${row.network}` : ""}
                    {row.isHealthy ? "" : " · unhealthy"}
                  </div>
                  <a className="muted" href={`/go/${row.id}`} style={{ fontSize: 13 }}>
                    /go/{row.id}
                  </a>
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => void toggleHealthy(row)}>
                    {row.isHealthy ? "Disable" : "Enable"}
                  </button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => void remove(row.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  margin: "0.35rem 0 0.85rem",
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.65rem 0.75rem",
};
