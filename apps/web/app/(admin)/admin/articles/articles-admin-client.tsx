"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";
import { ARTICLE_KINDS } from "@/lib/article-generate";

type ArticleRow = {
  id: string;
  slug: string;
  kind: string;
  status: string;
  title: string;
};

export function ArticlesAdminClient({
  locale,
  initialArticles,
  toolSlugs,
}: {
  locale: Locale;
  initialArticles: ArticleRow[];
  toolSlugs: string[];
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<(typeof ARTICLE_KINDS)[number]>("recommend");
  const [topic, setTopic] = useState(locale === "ja" ? "ビジネス" : "business");
  const [selected, setSelected] = useState<string[]>(toolSlugs.slice(0, 6));

  async function generate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/articles", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          kind,
          generate: true,
          topic,
          toolSlugs: selected,
          status: "published",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setMessage(dict.common.success);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(dict.common.delete + "?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/articles/${id}`, {
        method: "DELETE",
        headers: adminMutationHeaders(),
      });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleSlug(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug].slice(0, 12),
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      {message ? <p className="pill">{message}</p> : null}
      <form
        className="card-surface"
        onSubmit={(e) => void generate(e)}
        style={{ padding: "1.1rem", display: "grid", gap: "0.75rem" }}
      >
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{dict.admin.generateArticle}</h2>
        <div
          style={{
            display: "grid",
            gap: "0.5rem",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          }}
        >
          <label>
            kind
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              {ARTICLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <label>
            topic
            <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            tools ({selected.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 160, overflow: "auto" }}>
            {toolSlugs.slice(0, 80).map((slug) => (
              <button
                key={slug}
                type="button"
                className={`chip ${selected.includes(slug) ? "chip-active" : ""}`}
                onClick={() => toggleSlug(slug)}
              >
                {slug}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {dict.admin.generateArticle}
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.55rem" }}>
        {initialArticles.map((a) => (
          <li
            key={a.id}
            className="card-surface"
            style={{
              padding: "0.85rem 1rem",
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{a.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {a.kind} · {a.status} · {a.slug}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <a className="btn btn-ghost" href={`/articles/${a.slug}`} target="_blank" rel="noreferrer">
                view
              </a>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={busy}
                onClick={() => void onDelete(a.id)}
              >
                {dict.common.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
