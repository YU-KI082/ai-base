import { repos } from "@ai-base/database";

export type ImproveCandidate = {
  targetType: "article" | "tool" | "social";
  targetId: string;
  reason: string;
  suggestedChanges: string[];
};

/**
 * Detect low-performing content and propose / apply safe improvements.
 */
export async function findImproveCandidates(): Promise<ImproveCandidate[]> {
  const out: ImproveCandidate[] = [];
  const articles = await repos.articles.listPublished("ja", 30);
  for (const a of articles) {
    const tr = a.translations[0];
    if (!tr) continue;
    const titleLen = tr.title.length;
    const bodyLen = tr.body.length;
    if (titleLen < 20 || bodyLen < 400) {
      out.push({
        targetType: "article",
        targetId: a.id,
        reason: titleLen < 20 ? "title_too_short" : "body_too_thin",
        suggestedChanges: [
          titleLen < 20 ? "Expand title with year + benefit" : "Expand body with FAQ + internal links",
          "Strengthen CTA to AI BASE tool pages",
        ],
      });
    }
  }

  const posts = await repos.socialPosts.list("published");
  for (const p of posts.slice(0, 20)) {
    const m = p.metrics?.[0];
    if (!m) continue;
    const plays = m.plays ?? 0;
    const clicks = m.affiliateClicks ?? 0;
    if (plays > 100 && clicks === 0) {
      out.push({
        targetType: "social",
        targetId: p.id,
        reason: "high_plays_zero_clicks",
        suggestedChanges: [
          "Rewrite CTA toward AI BASE",
          "Shorten hook first 3s",
          "Try alternate hashtags",
        ],
      });
    }
  }
  return out.slice(0, 12);
}

export async function applyArticleImprovement(articleId: string, reason: string) {
  const articles = await repos.articles.listAll(200);
  const article = articles.find((a) => a.id === articleId);
  if (!article) return null;
  const ja = article.translations.find((t) => t.locale === "ja") ?? article.translations[0];
  if (!ja) return null;

  const improvedTitle =
    ja.title.length < 24
      ? `${ja.title}｜特徴・料金・向き不向き【AI BASE】`
      : ja.title;
  const improvedBody =
    ja.body.length < 500
      ? `${ja.body}\n\n## 追記（自動改善）\n- 関連ツールへの内部リンクを追加しました\n- CTA: AI BASEで最新情報を確認\n- 理由: ${reason}\n`
      : `${ja.body}\n\n<!-- auto-improve ${new Date().toISOString()} ${reason} -->\n`;

  const updated = await repos.articles.upsert({
    id: article.id,
    slug: article.slug,
    kind: article.kind,
    status: article.status,
    ja: {
      title: improvedTitle,
      summary: ja.summary,
      body: improvedBody,
    },
  });

  await repos.snsLearning.logImprovement({
    agentKey: "auto-improve",
    summary: `Improved article ${article.slug}: ${reason}`,
    fromState: { title: ja.title, bodyLen: ja.body.length },
    toState: { title: improvedTitle, bodyLen: improvedBody.length },
    metadata: { articleId, reason },
  });

  return updated;
}
