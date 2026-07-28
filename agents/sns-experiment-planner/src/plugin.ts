import type { AgentPlugin } from "@ai-base/agents-sdk";
import {
  EventTypes,
  createEvent,
  parseEvent,
  SnsExperimentPlanRequestedDataSchema,
} from "@ai-base/events";
import { planWeeklyExperiments } from "@ai-base/sns-learning";

export const snsExperimentPlannerPlugin: AgentPlugin = {
  manifest: {
    key: "sns-experiment-planner",
    version: "0.1.0",
    displayName: {
      en: "SNS Experiment Planner",
      ja: "SNS実験プランナー",
    },
    subscribe: [EventTypes.SnsExperimentPlanRequested],
    publish: [EventTypes.SnsExperimentCreated],
    capabilities: ["ab_planning", "single_factor_tests"],
  },
  async handle(ctx, event) {
    if (event.type === EventTypes.SnsExperimentPlanRequested) {
      parseEvent(event, SnsExperimentPlanRequestedDataSchema);
    }

    const patterns = await ctx.repos.snsLearning.listPatterns("active");
    const plans = planWeeklyExperiments(
      patterns.map((p) => ({
        platform: p.platform,
        locale: p.locale,
        title: p.title,
        confidence: p.confidence,
      })),
    );

    const experimentIds: string[] = [];
    for (const plan of plans) {
      const row = await ctx.repos.snsLearning.createExperiment({
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
          status: "planned",
        },
        variants: plan.variants.map((v) => ({
          key: v.key,
          label: v.label,
          config: v.config,
        })),
      });
      experimentIds.push(row.id);
    }

    await ctx.repos.snsLearning.logImprovement({
      agentKey: ctx.agentKey,
      summary: `Planned ${experimentIds.length} single-factor SNS experiments`,
      toState: { experimentIds },
    });

    await ctx.publish(
      createEvent({
        type: EventTypes.SnsExperimentCreated,
        source: "agent:sns-experiment-planner",
        dataschema: "https://ai-base.local/schemas/sns.experiment.created.v1.json",
        correlationid: ctx.correlationId,
        causationid: event.id,
        data: { experimentIds },
      }),
    );
  },
};
