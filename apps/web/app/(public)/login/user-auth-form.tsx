"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function UserAuthForm({
  mode,
  nextPath,
}: {
  mode: "login" | "signup";
  nextPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const action = mode === "signup" ? "signup" : "login";
      const res = await fetch(`/api/v1/os/auth?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "signup" && name ? { name } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "エラーが発生しました");
        return;
      }
      router.replace(nextPath || "/admin");
      router.refresh();
    } catch {
      setError("通信エラーです");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="os-auth-card" onSubmit={(e) => void onSubmit(e)}>
      {mode === "signup" ? (
        <label className="os-field">
          <span>お名前</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田"
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="os-field">
        <span>メール</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>
      <label className="os-field">
        <span>パスワード</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8文字以上"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      <button className="os-btn os-btn-primary" disabled={busy} type="submit">
        {busy ? "処理中…" : mode === "signup" ? "無料で始める" : "ログイン"}
      </button>
      {error ? <p className="os-error">{error}</p> : null}
      <p className="os-auth-switch">
        {mode === "login" ? (
          <>
            アカウントがない方は <Link href="/signup">新規登録</Link>
          </>
        ) : (
          <>
            既にアカウントがある方は <Link href="/login">ログイン</Link>
          </>
        )}
      </p>
    </form>
  );
}
