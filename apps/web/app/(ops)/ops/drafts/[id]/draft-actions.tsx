"use client";

import { adminMutationHeaders } from "@/lib/admin-fetch";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DraftActions({
  draftId,
  labels,
}: {
  draftId: string;
  labels: { approve: string; reject: string; comment: string };
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/drafts/${draftId}/${decision}`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface" style={{ padding: "1rem", marginTop: "1rem" }}>
      <label className="muted" htmlFor="comment">
        {labels.comment}
      </label>
      <textarea
        id="comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          marginTop: 8,
          background: "var(--bg)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "0.75rem",
        }}
      />
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => void decide("approve")}>
          {labels.approve}
        </button>
        <button className="btn btn-danger" disabled={busy} onClick={() => void decide("reject")}>
          {labels.reject}
        </button>
      </div>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
    </section>
  );
}
