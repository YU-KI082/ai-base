"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OsLogoutButton } from "../os-logout-button";

type Me = {
  user?: { id: string; email: string; name: string | null };
  setupDone?: boolean;
};

type BrandPayload = {
  brand?: { brandName?: string } | null;
  handles?: Array<{ platform: string; username: string }>;
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [brand, setBrand] = useState<BrandPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [authRes, brandRes] = await Promise.all([
        fetch("/api/v1/os/auth"),
        fetch("/api/v1/os/brand"),
      ]);
      if (authRes.status === 401) {
        window.location.href = "/login?next=/admin/account";
        return;
      }
      const auth = await authRes.json();
      const brandData = await brandRes.json();
      if (!authRes.ok) {
        setError(auth.error || "読み込みに失敗しました");
        return;
      }
      setMe(auth);
      if (brandRes.ok) setBrand(brandData);
    })();
  }, []);

  if (error) {
    return (
      <main className="os-page">
        <p className="os-error">{error}</p>
      </main>
    );
  }

  if (!me) {
    return <main className="os-page">読み込み中…</main>;
  }

  return (
    <main className="os-page">
      <p className="os-eyebrow">Account</p>
      <h1>アカウント設定</h1>
      <p className="os-lead">ログイン情報とブランド状況を確認できます。</p>

      <section className="os-card">
        <h2>ログイン</h2>
        <p>
          <span className="os-muted">メール</span>
          <br />
          <strong>{me.user?.email}</strong>
        </p>
        {me.user?.name ? (
          <p>
            <span className="os-muted">表示名</span>
            <br />
            <strong>{me.user.name}</strong>
          </p>
        ) : null}
        <p className="os-muted">
          初期設定: {me.setupDone ? "完了" : "未完了"}
        </p>
      </section>

      <section className="os-card">
        <h2>ブランド</h2>
        <p>
          <strong>{brand?.brand?.brandName || "未設定"}</strong>
        </p>
        <ul className="os-muted">
          {(brand?.handles ?? []).map((h) => (
            <li key={h.platform}>
              {h.platform}: @{h.username}
            </li>
          ))}
        </ul>
        <div className="os-row">
          <Link className="os-chip" href="/admin/brand">
            ブランドを編集
          </Link>
          <Link className="os-chip" href="/admin/setup">
            SNSユーザー名を見直す
          </Link>
        </div>
      </section>

      <section className="os-card">
        <h2>改善履歴</h2>
        <ImprovementHistory />
      </section>

      <section className="os-card">
        <h2>セッション</h2>
        <OsLogoutButton label="ログアウト" />
      </section>
    </main>
  );
}

function ImprovementHistory() {
  const [items, setItems] = useState<
    Array<{ id: string; dateKey: string; title: string; result: string; cause: string }>
  >([]);

  useEffect(() => {
    void fetch("/api/v1/os/improvements")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) {
    return (
      <p className="os-muted">
        まだ改善履歴はありません。ホームのミッションを完了すると学習が始まります。
      </p>
    );
  }

  return (
    <ul className="os-task-list" style={{ marginTop: 0 }}>
      {items.slice(0, 8).map((it) => (
        <li key={it.id}>
          <span>
            <strong>
              {it.dateKey.slice(5).replace("-", "/")} {it.title}
            </strong>
            <em>
              結果: {it.result || "計測中"}
              {it.cause ? ` / 原因: ${it.cause}` : ""}
            </em>
          </span>
        </li>
      ))}
    </ul>
  );
}
