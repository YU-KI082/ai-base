import { repos } from "@ai-base/database";
import { SocialAdminClient } from "./social-admin-client";

export default async function SocialAdminPage() {
  const posts = await repos.socialPosts.list();

  return (
    <main>
      <h1 style={{ fontFamily: "var(--font-display-loaded), serif", marginTop: 0 }}>
        Social drafts
      </h1>
      <p className="muted">
        SNS投稿基盤: Social agent creates drafts on publish. Mark ready / published here —
        external network posting stays manual for MVP.
      </p>
      <SocialAdminClient
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
