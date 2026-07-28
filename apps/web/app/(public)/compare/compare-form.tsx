"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, tf } from "@ai-base/i18n";
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
  const t = getDictionary(locale).public;
  const [slots, setSlots] = useState<[string, string, string]>([
    initial[0] ?? "",
    initial[1] ?? "",
    initial[2] ?? "",
  ]);

  const options = useMemo(() => catalog, [catalog]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const tools = slots.filter(Boolean);
    const params = new URLSearchParams();
    if (locale === "en") params.set("locale", "en");
    if (tools.length) params.set("tools", tools.join(","));
    router.push(`/compare?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="card-surface" style={{ padding: "1.15rem 1.25rem" }}>
      <p className="muted" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
        {t.comparePickTools}
      </p>
      {slots.map((value, i) => (
        <select
          key={i}
          value={value}
          onChange={(e) => {
            const next = [...slots] as [string, string, string];
            next[i] = e.target.value;
            setSlots(next);
          }}
          style={{
            display: "block",
            width: "100%",
            marginBottom: "0.55rem",
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "0.7rem 0.85rem",
          }}
        >
          <option value="">{tf(t.toolSlot, { n: i + 1 })}</option>
          {options.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {tool.name}
            </option>
          ))}
        </select>
      ))}
      <button className="btn btn-primary" type="submit" style={{ marginTop: "0.35rem" }}>
        {label}
      </button>
    </form>
  );
}
