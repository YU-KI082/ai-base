import { z } from "zod";

export const DraftDecisionBodySchema = z.object({
  comment: z.string().max(4000).optional(),
});

export const AgentEnableBodySchema = z.object({
  enabled: z.boolean(),
});

export const AgentConfigBodySchema = z.object({
  config: z
    .record(z.unknown())
    .refine(
      (cfg) =>
        !Object.keys(cfg).some((k) =>
          /api[_-]?key|secret|password|token/i.test(k),
        ),
      { message: "Secrets must not be stored in agent config" },
    ),
});
