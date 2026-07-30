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

type SettingsPayload = {
  plan: string;
  planLabel: string;
  name: string;
  settings: {
    notifications?: { dailyBrief?: boolean; tasks?: boolean };
    locale?: string;
  };
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [brand, setBrand] = useState<BrandPayload | null>(null);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [authRes, brandRes, settingsRes] = await Promise.all([
        fetch("/api/v1/os/auth"),
        fetch("/api/v1/os/brand"),
        fetch("/api/v1/os/settings"),
      ]);
      if (authRes.status === 401) {
        window.location.href = "/login?next=/admin/account";
        return;
      }
      const auth = await authRes.json();
      const brandData = await brandRes.json();
      const settingsData = await settingsRes.json();
      if (!authRes.ok) {
        setError(auth.error || "読み込みに失敗しました");
        return;
      }
      setMe(auth);
      if (brandRes.ok) setBrand(brandData);
      if (settingsRes.ok) setSettings(settingsData);
    })();
  }, []);

  async function saveSettings(patch: {
    name?: string;
    settings?: SettingsPayload["settings"];
  }) {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/v1/os/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "保存に失敗しました");
      return;
    }
    setSettings(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  if (error && !me) {
    return (
      <main className="os-page">
        <p className="os-error">{error}</p>
      </main>
    );
  }

  if (!me) {
    return <main className="os-page">読み込み中…</main>;
  }

  const notif = settings?.settings.notifications ?? {
    dailyBrief: true,
    tasks: true,
  };

  return (
    <main className="os-page">
      <p className="os-eyebrow">Account</p>
      <h1>設定</h1>
      <p className="os-lead">アカウント、通知、プランを管理します。</p>

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
        <h2>プラン</h2>
        <p>
          <strong>{settings?.planLabel || "Free"}</strong>
          <span className="os-muted">（{settings?.plan || "free"}）</span>
        </p>
        <p className="os-muted">
          サブスクリプション課金は準備中です。プラン枠だけ先に用意しています。
        </p>
      </section>

      <section className="os-card">
        <h2>通知</h2>
        <ul className="os-task-list" style={{ marginTop: 0 }}>
          <li>
            <label>
              <input
                type="checkbox"
                checked={notif.dailyBrief !== false}
                disabled={saving || !settings}
                onChange={(e) =>
                  void saveSettings({
                    settings: {
                      ...settings?.settings,
                      notifications: {
                        ...notif,
                        dailyBrief: e.target.checked,
                      },
                    },
                  })
                }
              />
              <span>
                <strong>AI Daily Brief</strong>
                <em>ホームに今日の指示を表示</em>
              </span>
            </label>
          </li>
          <li>
            <label>
              <input
                type="checkbox"
                checked={notif.tasks !== false}
                disabled={saving || !settings}
                onChange={(e) =>
                  void saveSettings({
                    settings: {
                      ...settings?.settings,
                      notifications: {
                        ...notif,
                        tasks: e.target.checked,
                      },
                    },
                  })
                }
              />
              <span>
                <strong>今日のタスク</strong>
                <em>未完了タスクを通知バッジに反映</em>
              </span>
            </label>
          </li>
        </ul>
        {saved ? <p className="os-muted">保存しました</p> : null}
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
        <h2>AI学習 / 改善履歴</h2>
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
    <>
      <p className="os-muted">学習ログ {items.length} 件</p>
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
    </>
  );
}
