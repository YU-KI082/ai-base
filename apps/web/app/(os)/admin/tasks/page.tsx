"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  title: string;
  detail: string;
  category: string;
  deepLink: string | null;
  doneAt: string | null;
};

export default function TasksPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/v1/os/tasks");
    const data = await res.json();
    setItems(data.taskSet?.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(id: string, done: boolean) {
    setBusy(true);
    await fetch("/api/v1/os/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id, done }),
    });
    await load();
    setBusy(false);
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">今日のタスク</p>
      <h1>AI社員の提案リスト</h1>
      <ul className="os-task-list">
        {items.map((it) => (
          <li key={it.id} className={it.doneAt ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(it.doneAt)}
                disabled={busy}
                onChange={(e) => void toggle(it.id, e.target.checked)}
              />
              <span>
                <strong>{it.title}</strong>
                <em>{it.detail}</em>
              </span>
            </label>
            {it.deepLink ? (
              <Link href={it.deepLink} className="os-chip">
                開く
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
