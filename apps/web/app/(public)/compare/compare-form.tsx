"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicLocale } from "@/lib/site";

export function CompareFormClient({
  locale,
  catalog,
  initial,
  label,
}: {
  locale: PublicLocale;
  catalog: Array<{ slug: string; name: string }>;
  initial: string[];
  label: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initial[0] ?? "");
  const [b, setB] = useState(initial[1] ?? "");
  const [c, setC] = useState(initial[2] ?? "");

  const options = useMemo(() => catalog, [catalog]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const tools = [a, b, c].filter(Boolean);
    const params = new URLSearchParams();
    if (locale === "ja") params.set("locale", "ja");
    if (tools.length) params.set("tools", tools.join(","));
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="card-surface" style={{ padding: "1rem" }}>
      <p className="muted" style={{ marginTop: 0 }}>
        {locale === "ja"
          ? "比較するツールを選ぶ（最大3）"
          : "Pick tools to compare (up to 3)"}
      </p>
      {[
        [a, setA],
        [b, setB],
        [c, setC],
      ].map(([value, setValue], i) => (
        <select
          key={i}
          value={value as string}
          onChange={(e) => (setValue as (v: string) => void)(e.target.value)}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "0.55rem",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "0.65rem 0.75rem",
          }}
        >
          <option value="">
            {locale === "ja" ? `ツール ${i + 1}` : `Tool ${i + 1}`}
          </option>
          {options.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {tool.name}
            </option>
          ))}
        </select>
      ))}
      <button className="btn btn-primary" type="submit">
        {label}
      </button>
    </form>
  );
}
