"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getDictionary, type Locale } from "@ai-base/i18n";

type Message = {
  id: string;
  role: string;
  content: string;
};

type NextAction = {
  title: string;
  why?: string;
  deepLink?: string;
};

export function AssistantHome({ locale = "ja" }: { locale?: Locale }) {
  const t = getDictionary(locale).os;
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [brandLabel, setBrandLabel] = useState<string | null>(null);
  const [handlesLabel, setHandlesLabel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [briefRes, brandRes] = await Promise.all([
          fetch("/api/v1/os/brief/today"),
          fetch("/api/v1/os/brand"),
        ]);
        if (briefRes.status === 401 || brandRes.status === 401) {
          window.location.href = "/login?next=/admin";
          return;
        }
        const data = await briefRes.json();
        if (!briefRes.ok) throw new Error(data.error || "読み込みに失敗しました");
        setMessages(data.messages ?? []);
        if (Array.isArray(data.nextActions)) {
          setNextActions(data.nextActions as NextAction[]);
        }
        const brandData = await brandRes.json();
        if (brandRes.ok) {
          setBrandLabel(brandData.brand?.brandName ?? null);
          const handles = (brandData.handles ?? []) as Array<{
            platform: string;
            username: string;
          }>;
          const labeled = handles
            .filter((h) => h.username)
            .map((h) => `${h.platform}@${h.username}`)
            .slice(0, 3)
            .join(" · ");
          setHandlesLabel(labeled || null);
        }
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "読み込みに失敗しました。再読み込みしてください。",
        );
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
      if (!res.ok) throw new Error(data.error || "送信に失敗しました。もう一度お試しください。");
      setMessages(data.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="os-assistant">
      <div className="os-assistant-head">
        <div>
          <p className="os-eyebrow">{t.employee}</p>
          <h1>{t.homeTitle}</h1>
          <p className="os-lead" style={{ marginBottom: 0 }}>
            {t.homeLead}
          </p>
          {brandLabel ? (
            <p className="os-muted" style={{ marginTop: "0.35rem" }}>
              担当ブランド: <strong style={{ color: "var(--os-ink)" }}>{brandLabel}</strong>
              {handlesLabel ? ` ／ ${handlesLabel}` : ""}
            </p>
          ) : null}
        </div>
        <div className="os-chip-row">
          <Link className="os-chip" href="/admin/analysis">
            {t.chipAnalysis}
          </Link>
          <Link className="os-chip" href="/admin/posts">
            {t.chipPosts}
          </Link>
          <Link className="os-chip" href="/admin/tasks">
            {t.chipTasks}
          </Link>
        </div>
      </div>

      {nextActions.length > 0 ? (
        <section className="os-card" style={{ marginBottom: "0.5rem" }}>
          <p className="os-eyebrow" style={{ marginBottom: "0.5rem" }}>
            {t.nextActions}
          </p>
          <div className="os-chip-row" style={{ margin: 0 }}>
            {nextActions.slice(0, 3).map((a) =>
              a.deepLink ? (
                <Link key={a.title} className="os-chip" href={a.deepLink}>
                  {a.title}
                </Link>
              ) : (
                <button
                  key={a.title}
                  type="button"
                  className="os-chip"
                  onClick={() => void send(a.title)}
                >
                  {a.title}
                </button>
              ),
            )}
          </div>
        </section>
      ) : null}

      <div className="os-chat-scroll">
        {booting ? (
          <div className="os-bubble os-bubble-ai">{t.briefingLoading}</div>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`os-bubble ${m.role === "user" ? "os-bubble-user" : "os-bubble-ai"}`}
          >
            {m.content}
          </div>
        ))}
        {busy ? <div className="os-bubble os-bubble-ai os-typing">{t.thinking}</div> : null}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="os-error">{error}</p> : null}

      <div className="os-quick">
        {[
          t.quickFollower,
          t.quickProfile,
          t.quickReel,
          t.quickCompetitor,
          t.quickSaveRate,
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
          placeholder={t.placeholder}
          disabled={busy}
        />
        <button className="os-btn os-btn-primary" disabled={busy || !input.trim()} type="submit">
          {t.send}
        </button>
      </form>
    </div>
  );
}
