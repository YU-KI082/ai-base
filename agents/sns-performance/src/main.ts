import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { snsPerformancePlugin } from "./plugin.js";

await bootstrapAgentMain(snsPerformancePlugin);
