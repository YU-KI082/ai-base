import { prisma, repos } from "@ai-base/database";
import {
  assertNoFabricatedMetrics,
  buildRecommendations,
  classifyOwnPostOutcome,
  decayWeight,
  extractViralPatterns,
  planWeeklyExperiments,
  scoreSocialDraft,
  seedStructureObservations,
} from "@ai-base/sns-learning";

async function main() {
  const seeds = seedStructureObservations();
  const obsIds: string[] = [];
  for (const row of seeds) {
    const o = await repos.snsLearning.createObservation({
      platform: row.platform,
      locale: row.locale,
      category: row.category ?? "ai_tools",
      theme: row.theme,
      hookPattern: row.hookPattern,
      durationSec: row.durationSec,
      captionDensity: row.captionDensity,
      subtitleStructure: row.subtitleStructure,
      sceneFlow: row.sceneFlow,
      format: row.format,
      ctaPattern: row.ctaPattern,
      hashtagPatterns: row.hashtagPatterns ?? [],
      postedAtHour: row.postedAtHour,
      commentTendency: row.commentTendency,
      plays: null,
      likes: null,
      whyItMayWork: row.whyItMayWork,
      sourceType: row.sourceType,
      sourceRef: row.sourceRef,
      confidence: row.confidence ?? 0.2,
    });
    obsIds.push(o.id);
  }

  const observations = await repos.snsLearning.listObservations();
  const patterns = extractViralPatterns(
    observations.map((o) => ({
      id: o.id,
      platform: o.platform as "instagram" | "tiktok",
      locale: o.locale as "en" | "ja",
      category: o.category,
      theme: o.theme,
      hookPattern: o.hookPattern,
      durationSec: o.durationSec,
      captionDensity: o.captionDensity,
      subtitleStructure: o.subtitleStructure,
      sceneFlow: o.sceneFlow,
      format: o.format,
      ctaPattern: o.ctaPattern,
      hashtagPatterns: o.hashtagPatterns,
      whyItMayWork: Array.isArray(o.whyItMayWork)
        ? (o.whyItMayWork as string[])
        : [],
      sourceType: o.sourceType as "seed_structure",
      confidence: o.confidence,
      observedAt: o.observedAt,
    })),
  );

  const patternIds: string[] = [];
  for (const p of patterns) {
    const row = await repos.snsLearning.createPattern({
      platform: p.platform,
      locale: p.locale,
      category: p.category,
      patternType: p.patternType,
      title: p.title,
      summary: p.summary,
      structure: p.structure,
      sampleSize: p.sampleSize,
      confidence: p.confidence,
      evidence: p.evidence,
      validUntil: p.validUntil,
    });
    patternIds.push(row.id);
  }

  const plans = planWeeklyExperiments(patterns);
  const experimentIds: string[] = [];
  for (const plan of plans) {
    const e = await repos.snsLearning.createExperiment({
      data: {
        title: plan.title,
        hypothesis: plan.hypothesis,
        changeFactor: plan.changeFactor,
        fixedFactors: plan.fixedFactors,
        platform: plan.platform,
        locale: plan.locale,
        evaluationDays: plan.evaluationDays,
        successMetric: plan.successMetric,
        minSampleSize: plan.minSampleSize,
        abortCondition: plan.abortCondition,
      },
      variants: plan.variants.map((v) => ({
        key: v.key,
        label: v.label,
        config: v.config,
      })),
    });
    experimentIds.push(e.id);
  }

  const tools = await repos.tools.findPublished("en", { take: 5 });
  const affiliates = await repos.affiliates.list();
  const recs = buildRecommendations({
    patterns: patterns.map((p) => ({
      platform: p.platform,
      locale: p.locale,
      title: p.title,
      summary: p.summary,
      confidence: p.confidence,
      structure: p.structure,
    })),
    learning: [],
    tools: tools.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.translations[0]?.name ?? t.slug,
    })),
    affiliates: affiliates.map((a) => ({ id: a.id, toolId: a.toolId })),
  });

  const rec = recs[0]!;
  const score = scoreSocialDraft({
    platform: rec.platform,
    locale: rec.locale,
    theme: rec.theme,
    hook: rec.recommendedHook,
    cta: rec.cta,
    content: rec.rationale,
    toolId: rec.toolId,
    patternConfidenceAvg: 0.3,
  });

  const recommendation = await repos.snsLearning.createRecommendation({
    theme: rec.theme,
    platform: rec.platform,
    locale: rec.locale,
    audience: rec.audience,
    recommendedHook: rec.recommendedHook,
    durationSec: rec.durationSec,
    postedAtHint: rec.postedAtHint,
    cta: rec.cta,
    toolId: rec.toolId,
    affiliateLinkId: rec.affiliateLinkId,
    goal: rec.goal,
    predictedScore: rec.predictedScore,
    rationale: rec.rationale,
  });

  const post = await repos.socialPosts.createDraft({
    platform: rec.platform,
    locale: rec.locale,
    status: "draft",
    content: `${rec.recommendedHook}\n\n${rec.theme}\nCTA: ${rec.cta}`,
    theme: rec.theme,
    hook: rec.recommendedHook,
    cta: rec.cta,
    durationSec: rec.durationSec,
    toolId: rec.toolId,
    scoreTotal: score.total,
    scoreBreakdown: score.breakdown,
    riskFlags: score.riskFlags,
    recommendation: { connect: { id: recommendation.id } },
  });
  await repos.socialPosts.updateStatus(post.id, "published");

  const metricsPayload = {
    plays: 1200,
    affiliateClicks: 0,
    conversions: 0,
    saveRate: 0.005,
  };
  assertNoFabricatedMetrics(metricsPayload);
  await repos.snsLearning.createMetrics({
    socialPost: { connect: { id: post.id } },
    windowHours: 24,
    source: "manual",
    plays: 1200,
    affiliateClicks: 0,
    conversions: 0,
    saveRate: 0.005,
  });

  const outcome = classifyOwnPostOutcome(metricsPayload);
  const learning = await repos.snsLearning.createLearning({
    kind: outcome.kind,
    platform: post.platform,
    locale: post.locale,
    title: outcome.title,
    content: "Verified loop learning from own metrics",
    evidencePostIds: [post.id],
    importance: 0.8,
    decayHalfLifeDays: 21,
    metadata: { decayWeight: decayWeight(1, 21) },
  });

  await repos.snsLearning.logImprovement({
    agentKey: "verify-script",
    summary: "End-to-end SNS learning loop verified",
    toState: {
      obsIds,
      patternIds,
      experimentIds,
      postId: post.id,
      learningId: learning.id,
      score: score.total,
    },
  });

  const dash = await repos.snsLearning.dashboard();
  console.log(
    JSON.stringify(
      {
        ok: true,
        observations: dash.observations.length,
        patterns: dash.patterns.length,
        experiments: dash.experiments.length,
        recommendations: dash.recommendations.length,
        learning: dash.learning.length,
        scoreTotal: score.total,
        blocked: score.blocked,
        outcome: outcome.kind,
        postId: post.id,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
