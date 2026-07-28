import { cookies } from "next/headers";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { repos } from "@ai-base/database";
import { listConnectionSummaries } from "@ai-base/sns-oauth";
import { SocialAdminClient } from "./social-admin-client";

export default async function SocialAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ oauth?: string; provider?: string; oauth_error?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const dict = getDictionary(locale);
  const [posts, connections] = await Promise.all([
    repos.socialPosts.list(),
    listConnectionSummaries(),
  ]);

  return (
    <main className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{dict.admin.socialTitle}</h1>
          <p className="page-subtitle">{dict.admin.socialSubtitle}</p>
        </div>
      </div>
      <SocialAdminClient
        locale={locale}
        oauthFlash={
          sp.oauth_error
            ? { type: "error", message: sp.oauth_error }
            : sp.oauth === "connected"
              ? {
                  type: "ok",
                  message: `${sp.provider ?? ""} ${dict.admin.oauthConnectedFlash}`,
                }
              : null
        }
        connections={connections}
        initialPosts={posts.map((p) => ({
          id: p.id,
          platform: p.platform,
          locale: p.locale,
          status: p.status,
          content: p.content,
          toolId: p.toolId,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
