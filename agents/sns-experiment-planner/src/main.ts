import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { snsExperimentPlannerPlugin } from "./plugin.js";

await bootstrapAgentMain(snsExperimentPlannerPlugin);
