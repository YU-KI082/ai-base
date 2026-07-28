import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { snsStrategyPlugin } from "./plugin.js";

await bootstrapAgentMain(snsStrategyPlugin);
