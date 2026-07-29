import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { trendPredictPlugin } from "./plugin.js";

await bootstrapAgentMain(trendPredictPlugin);
