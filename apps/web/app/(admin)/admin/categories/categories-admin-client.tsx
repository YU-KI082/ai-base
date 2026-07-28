"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type Cat = { key: string; name: string; sortOrder: number };

export function CategoriesAdminClient({
  locale,
  initialCategories,
}: {
  locale: Locale;
  initialCategories: Cat[];
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [jaName, setJaName] = useState("");
  const [enName, setEnName] = useState("");
  const [sortOrder, setSortOrder] = useState(100);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/categories", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          key,
          jaName,
          enName: enName || jaName,
          sortOrder,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setKey("");
      setJaName("");
      setEnName("");
      setMessage(dict.common.success);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(catKey: string) {
    if (!window.confirm(dict.common.delete + "?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/categories/${encodeURIComponent(catKey)}`, {
        method: "DELETE",
        headers: adminMutationHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? res.statusText);
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {message ? <p className="pill">{message}</p> : null}
      <form
        className="card-surface"
        onSubmit={(e) => void onSubmit(e)}
        style={{ padding: "1.1rem", display: "grid", gap: "0.65rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
          {dict.common.create} {dict.admin.categories}
        </h2>
        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          }}
        >
          <label>
            key
            <input className="input" value={key} onChange={(e) => setKey(e.target.value)} required />
          </label>
          <label>
            JA
            <input className="input" value={jaName} onChange={(e) => setJaName(e.target.value)} required />
          </label>
          <label>
            EN
            <input className="input" value={enName} onChange={(e) => setEnName(e.target.value)} />
          </label>
          <label>
            sort
            <input
              className="input"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {dict.common.save}
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.55rem" }}>
        {initialCategories.map((c) => (
          <li
            key={c.key}
            className="card-surface"
            style={{
              padding: "0.85rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}
          >
            <div>
              <strong>{c.name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {c.key} · sort {c.sortOrder}
              </div>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={busy}
              onClick={() => void onDelete(c.key)}
            >
              {dict.common.delete}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
