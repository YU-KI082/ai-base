import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { plannerPlugin } from "./plugin.js";

await bootstrapAgentMain(plannerPlugin);
