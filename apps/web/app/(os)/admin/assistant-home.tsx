"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = {
  id: string;
  role: string;
  content: string;
};

export function AssistantHome() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/v1/os/chat");
        if (res.status === 401) {
          window.location.href = "/login?next=/admin";
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "failed");
        setMessages(data.messages ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, role: "user", content: message },
    ]);
    try {
      const res = await fetch("/api/v1/os/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      setMessages(data.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-assistant">
      <div className="os-assistant-head">
        <div>
          <p className="os-eyebrow">AI社員</p>
          <h1>今日のマーケ、一緒に進めましょう</h1>
        </div>
        <div className="os-chip-row">
          <Link className="os-chip" href="/admin/analysis">
            分析
          </Link>
          <Link className="os-chip" href="/admin/posts">
            投稿生成
          </Link>
          <Link className="os-chip" href="/admin/tasks">
            今日のタスク
          </Link>
        </div>
      </div>

      <div className="os-chat-scroll">
        {booting ? (
          <div className="os-bubble os-bubble-ai">今日のブリーフィングを準備しています…</div>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`os-bubble ${m.role === "user" ? "os-bubble-user" : "os-bubble-ai"}`}
          >
            {m.content}
          </div>
        ))}
        {busy ? <div className="os-bubble os-bubble-ai os-typing">考えています…</div> : null}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="os-error">{error}</p> : null}

      <div className="os-quick">
        {[
          "フォロワーを増やしたい",
          "プロフィール改善して",
          "リール考えて",
          "競合分析して",
          "保存率を上げたい",
        ].map((q) => (
          <button key={q} type="button" className="os-chip" onClick={() => void send(q)}>
            {q}
          </button>
        ))}
      </div>

      <form
        className="os-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="何でも相談してください…"
          disabled={busy}
        />
        <button className="os-btn os-btn-primary" disabled={busy || !input.trim()} type="submit">
          送信
        </button>
      </form>
    </div>
  );
}
