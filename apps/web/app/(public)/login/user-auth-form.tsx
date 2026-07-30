"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getDictionary, type Locale } from "@ai-base/i18n";

export function UserAuthForm({
  mode,
  nextPath,
  locale = "ja",
}: {
  mode: "login" | "signup";
  nextPath: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale).os;
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
        setError(body.error ?? "Error");
        return;
      }
      router.replace(nextPath || "/admin");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="os-auth-card" onSubmit={(e) => void onSubmit(e)}>
      {mode === "signup" ? (
        <label className="os-field">
          <span>{locale === "ja" ? "お名前" : "Name"}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
      ) : null}
      <label className="os-field">
        <span>{locale === "ja" ? "メール" : "Email"}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="os-field">
        <span>{locale === "ja" ? "パスワード" : "Password"}</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      <button className="os-btn os-btn-primary" disabled={busy} type="submit">
        {busy
          ? "…"
          : mode === "signup"
            ? t.setupLaunch
            : locale === "ja"
              ? "ログイン"
              : "Log in"}
      </button>
      {error ? <p className="os-error">{error}</p> : null}
      <p className="os-auth-switch">
        {mode === "login" ? (
          <>
            <Link href="/signup">{t.signupTitle}</Link>
          </>
        ) : (
          <>
            <Link href="/login">{locale === "ja" ? "ログイン" : "Log in"}</Link>
          </>
        )}
      </p>
    </form>
  );
}
