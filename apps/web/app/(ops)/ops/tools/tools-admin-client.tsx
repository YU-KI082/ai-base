"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Locale } from "@ai-base/i18n";
import { adminMutationHeaders } from "@/lib/admin-fetch";

type ToolRow = {
  id: string;
  slug: string;
  homepageUrl: string;
  pricingModel: string;
  hasFreePlan: boolean;
  hasApi: boolean;
  status: string;
  translations: Array<{ locale: string; name: string; description: string }>;
  categories: Array<{ category: { key: string } }>;
};

export function ToolsAdminClient({
  locale,
  initialTools,
  categories,
}: {
  locale: Locale;
  initialTools: ToolRow[];
  categories: Array<{ key: string; name: string }>;
}) {
  const router = useRouter();
  const dict = getDictionary(locale);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [slug, setSlug] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("https://");
  const [pricingModel, setPricingModel] = useState("freemium");
  const [hasFreePlan, setHasFreePlan] = useState(true);
  const [hasApi, setHasApi] = useState(false);
  const [categoryKey, setCategoryKey] = useState(categories[0]?.key ?? "text");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return initialTools;
    return initialTools.filter((t) => {
      const n = t.translations.find((x) => x.locale === "ja")?.name ?? t.slug;
      return t.slug.includes(needle) || n.toLowerCase().includes(needle);
    });
  }, [initialTools, q]);

  function resetForm() {
    setEditingId(undefined);
    setSlug("");
    setHomepageUrl("https://");
    setPricingModel("freemium");
    setHasFreePlan(true);
    setHasApi(false);
    setName("");
    setDescription("");
    setTags("");
    setPricingNotes("");
  }

  function startEdit(tool: ToolRow) {
    const ja = tool.translations.find((x) => x.locale === "ja");
    setEditingId(tool.id);
    setSlug(tool.slug);
    setHomepageUrl(tool.homepageUrl);
    setPricingModel(tool.pricingModel);
    setHasFreePlan(tool.hasFreePlan);
    setHasApi(tool.hasApi);
    setCategoryKey(tool.categories[0]?.category.key ?? categories[0]?.key ?? "text");
    setName(ja?.name ?? tool.slug);
    setDescription(ja?.description ?? "");
    setTags("");
    setPricingNotes("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/admin/tools", {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({
          id: editingId,
          slug,
          homepageUrl,
          pricingModel,
          hasFreePlan,
          hasApi,
          status: "published",
          categoryKey,
          ja: {
            name,
            description,
            tags: tags
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            pricingNotes: pricingNotes || undefined,
            languageSupport: ["日本語", "英語"],
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setMessage(dict.common.success);
      resetForm();
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(dict.admin.deleteTool + "?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/tools/${id}`, {
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
          {editingId ? dict.admin.editTool : dict.admin.addTool}
        </h2>
        <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
          <label>
            slug
            <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label>
            homepage
            <input
              className="input"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              required
            />
          </label>
          <label>
            pricing
            <select
              className="input"
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value)}
            >
              {["free", "freemium", "paid", "enterprise"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label>
            category
            <select
              className="input"
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          name (JA)
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          description (JA)
          <textarea
            className="input"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>
        <label>
          tags (comma)
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        <label>
          pricing notes
          <input
            className="input"
            value={pricingNotes}
            onChange={(e) => setPricingNotes(e.target.value)}
          />
        </label>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={hasFreePlan}
              onChange={(e) => setHasFreePlan(e.target.checked)}
            />
            free plan
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={hasApi} onChange={(e) => setHasApi(e.target.checked)} />
            API
          </label>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-primary" disabled={busy} type="submit">
            {dict.common.save}
          </button>
          {editingId ? (
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              {dict.common.cancel}
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          className="input"
          placeholder={dict.common.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <span className="muted" style={{ fontSize: 13 }}>
          {filtered.length} / {initialTools.length}
        </span>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.55rem" }}>
        {filtered.map((tool) => {
          const n =
            tool.translations.find((x) => x.locale === "ja")?.name ?? tool.slug;
          return (
            <li
              key={tool.id}
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
                <div style={{ fontWeight: 600 }}>{n}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {tool.slug} · {tool.pricingModel} · {tool.status}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <a className="btn btn-ghost" href={`/tools/${tool.slug}`} target="_blank" rel="noreferrer">
                  view
                </a>
                <button className="btn btn-ghost" type="button" onClick={() => startEdit(tool)}>
                  {dict.admin.editTool}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={busy}
                  onClick={() => void onDelete(tool.id)}
                >
                  {dict.admin.deleteTool}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
