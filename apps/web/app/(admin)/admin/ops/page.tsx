import { cookies } from "next/headers";
import Link from "next/link";
import { formatCurrency, getDictionary, resolveLocale } from "@ai-base/i18n";
import { buildOpsDashboard } from "@ai-base/sns-auto-ops";
import { OpsDashboardClient } from "./ops-dashboard-client";

export const dynamic = "force-dynamic";

export default async function OpsDashboardPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const data = await buildOpsDashboard();
  const { summary, health, openAlerts, settings } = data;

  const yen = (n: number) => formatCurrency(n, locale, "JPY");

  const hero = [
    { label: dict.admin.opsTodaySales, value: yen(summary.todaySales) },
    { label: dict.admin.opsMonthSales, value: yen(summary.monthSales) },
    { label: dict.admin.opsMonthProfit, value: yen(summary.monthProfit) },
    {
      label: dict.admin.opsConversions,
      value: String(summary.conversionsMonth),
    },
  ];

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <p className="page-kicker">{dict.admin.ops}</p>
          <h1 className="page-title">{dict.admin.opsDashboard}</h1>
          <p className="page-subtitle">{dict.admin.opsDashboardSubtitle}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link className="btn btn-ghost" href="/admin/affiliate">
            {dict.admin.affiliate}
          </Link>
          <Link className="btn btn-ghost" href="/admin/social">
            {dict.admin.social}
          </Link>
          <Link className="btn btn-ghost" href="/admin/sns">
            {dict.admin.snsLearning}
          </Link>
        </div>
      </div>

      <div
        className="grid-2"
        style={{
          marginTop: "1.5rem",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        }}
      >
        {hero.map((card) => (
          <div key={card.label} className="card-surface" style={{ padding: "1.25rem" }}>
            <div className="muted" style={{ fontSize: 13 }}>
              {card.label}
            </div>
            <div
              style={{
                fontSize: "1.85rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                marginTop: 6,
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid-2"
        style={{ marginTop: "1rem", gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
      >
        <div className="card-surface" style={{ padding: "1.15rem" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {dict.admin.opsTopTool}
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 600, marginTop: 6 }}>
            {summary.topToolName ?? "—"}
          </div>
        </div>
        <div className="card-surface" style={{ padding: "1.15rem" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {dict.admin.opsTopPost}
          </div>
          <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.45 }}>
            {summary.topPost
              ? `${summary.topPost.platform}: ${summary.topPost.content}`
              : "—"}
          </div>
        </div>
        <div className="card-surface" style={{ padding: "1.15rem" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            {dict.admin.opsHealth}
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 600, marginTop: 6 }}>
            {health.emergencyStop
              ? dict.admin.opsEmergencyOn
              : health.mode === "full_auto"
                ? dict.admin.opsModeFullAuto
                : health.mode === "approval"
                  ? dict.admin.opsModeApproval
                  : dict.admin.opsModeDraftOnly}
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "0.35rem 0 0" }}>
            {dict.admin.opsDailyLimit}: {health.effectiveDailyLimit}
          </p>
        </div>
        <div
          className="card-surface"
          style={{
            padding: "1.15rem",
            borderColor: openAlerts.length ? "var(--danger)" : undefined,
          }}
        >
          <div className="muted" style={{ fontSize: 13 }}>
            {dict.admin.opsCriticalAlerts}
          </div>
          <div
            style={{
              fontSize: "1.85rem",
              fontWeight: 600,
              marginTop: 6,
              color: openAlerts.length ? "var(--danger)" : undefined,
            }}
          >
            {openAlerts.length}
          </div>
        </div>
      </div>

      <OpsDashboardClient
        locale={locale}
        settings={settings}
        alerts={openAlerts.map((a) => ({
          id: a.id,
          title: a.title,
          message: a.message,
          kind: a.kind,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
