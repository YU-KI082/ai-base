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

type Mission = {
  rank: number;
  title: string;
  detail: string;
  deepLink?: string;
};

type ExpectedEffect = {
  followersMin: number;
  followersMax: number;
};

export function AssistantHome({ locale = "ja" }: { locale?: Locale }) {
  const t = getDictionary(locale).os;
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextActions, setNextActions] = useState<NextAction[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [expected, setExpected] = useState<ExpectedEffect | null>(null);
  const [brandLabel, setBrandLabel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);

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
        const payload = data.brief?.payload;
        if (payload?.missions && Array.isArray(payload.missions)) {
          setMissions(payload.missions as Mission[]);
        }
        if (payload?.expectedEffect) {
          setExpected(payload.expectedEffect as ExpectedEffect);
        }
        const brandData = await brandRes.json();
        if (brandRes.ok) {
          setBrandLabel(brandData.brand?.brandName ?? null);
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
      if (!res.ok) {
        throw new Error(data.error || "送信に失敗しました。もう一度お試しください。");
      }
      setMessages(data.messages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました。");
    } finally {
      setBusy(false);
      composerRef.current?.focus();
    }
  }

  return (
    <div className="os-assistant os-assistant-employee">
      <header className="os-assistant-head os-assistant-head-minimal">
        <p className="os-eyebrow">{t.employee}</p>
        <h1 className="os-home-greeting">
          {brandLabel ? `${brandLabel}の今日` : t.homeTitle}
        </h1>
        <p className="os-lead" style={{ marginBottom: 0 }}>
          分析で終わらず、原因→改善→実行まで一緒に進めます。
        </p>
        <div className="os-chip-row">
          <Link className="os-chip" href="/admin/studio">
            Photo Studio
          </Link>
          <Link className="os-chip" href="/admin/create">
            {t.chipPosts}
          </Link>
        </div>
      </header>

      {(missions.length > 0 || expected) && (
        <section className="os-mission-rail" aria-label="今日のミッション">
          {expected ? (
            <div className="os-mission-effect">
              今日の予想効果
              <strong>
                フォロワー +{expected.followersMin}〜{expected.followersMax}人
              </strong>
            </div>
          ) : null}
          <div className="os-mission-cards">
            {(missions.length
              ? missions
              : nextActions.slice(0, 3).map((a, i) => ({
                  rank: i + 1,
                  title: a.title,
                  detail: a.why || "",
                  deepLink: a.deepLink,
                }))
            ).map((m) => (
              <article key={`${m.rank}-${m.title}`} className="os-mission-card">
                <span className="os-mission-rank">
                  {["①", "②", "③"][m.rank - 1] ?? m.rank}
                </span>
                <div>
                  <strong>{m.title}</strong>
                  {m.detail ? <p>{m.detail}</p> : null}
                  {m.deepLink ? (
                    <Link href={m.deepLink} className="os-chip">
                      進む
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="os-chip"
                      onClick={() => void send(m.title)}
                    >
                      相談する
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

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
        {busy ? (
          <div className="os-bubble os-bubble-ai os-typing">{t.thinking}</div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="os-error">{error}</p> : null}

      <div className="os-quick">
        {[
          t.quickFollower,
          t.quickProfile,
          t.quickReel,
          t.quickCompetitor,
          "今日のブリーフを要約して",
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
          ref={composerRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="何を手伝いましょうか？"
          disabled={busy}
        />
        <button className="os-btn os-btn-primary" disabled={busy || !input.trim()} type="submit">
          {t.send}
        </button>
      </form>
    </div>
  );
}
