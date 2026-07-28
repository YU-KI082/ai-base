"use client";

import { adminMutationHeaders } from "@/lib/admin-fetch";
import { useState } from "react";

export function IngestForm() {
  const [name, setName] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [categoryHints, setCategoryHints] = useState("productivity");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const res = await fetch("/api/v1/admin/ingest", {
      method: "POST",
      headers: adminMutationHeaders(),
      body: JSON.stringify({
        name,
        homepageUrl,
        description,
        sourceName: "manual",
        categoryHints: categoryHints
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? res.statusText);
      return;
    }
    setResult(JSON.stringify(body, null, 2));
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="card-surface" style={{ padding: "1rem", maxWidth: 640 }}>
      <label>
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label>
        Homepage URL
        <input
          required
          type="url"
          value={homepageUrl}
          onChange={(e) => setHomepageUrl(e.target.value)}
          style={inputStyle}
        />
      </label>
      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={inputStyle}
        />
      </label>
      <label>
        Category hints (comma-separated)
        <input
          value={categoryHints}
          onChange={(e) => setCategoryHints(e.target.value)}
          style={inputStyle}
        />
      </label>
      <button className="btn btn-primary" type="submit" style={{ marginTop: "0.75rem" }}>
        Start pipeline
      </button>
      {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
      {result ? <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre> : null}
    </form>
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
