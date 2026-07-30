import { cookies } from "next/headers";
import { formatDateTime, getDictionary, resolveLocale } from "@ai-base/i18n";
import { buildSelfHealingDashboard } from "@ai-base/self-healing";
import { SelfHealingClient } from "./self-healing-client";

export const dynamic = "force-dynamic";

export default async function SelfHealingAdminPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const dash = await buildSelfHealingDashboard();

  return (
    <main className="admin-main">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.selfHealingTitle}</h1>
          <p className="page-subtitle">{dict.admin.selfHealingSubtitle}</p>
        </div>
      </div>

      <SelfHealingClient
        locale={locale}
        settings={dash.settings}
        canApply={dash.canApplyInThisRuntime}
        open={dash.open.map((i) => ({
          id: i.id,
          title: i.title,
          message: i.message,
          kind: i.kind,
          severity: i.severity,
          location: i.location,
          cause: i.cause,
          status: i.status,
          attemptCount: i.attemptCount,
          maxAttempts: i.maxAttempts,
          requiresApproval: i.requiresApproval,
          changedFiles: i.changedFiles,
          testResults: i.testResults,
          rollbackResult: i.rollbackResult,
          createdAt: i.createdAt.toISOString(),
          attempts: i.attempts.map((a) => ({
            id: a.id,
            attemptNumber: a.attemptNumber,
            action: a.action,
            success: a.success,
            changedFiles: a.changedFiles,
            errorMessage: a.errorMessage,
            createdAt: a.createdAt.toISOString(),
          })),
        }))}
        history={dash.history.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
          severity: i.severity,
          attemptCount: i.attemptCount,
          requiresApproval: i.requiresApproval,
          changedFiles: i.changedFiles,
          createdAt: formatDateTime(i.createdAt, locale),
          updatedAt: formatDateTime(i.updatedAt, locale),
        }))}
      />
    </main>
  );
}
