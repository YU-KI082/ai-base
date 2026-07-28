import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { analyticsPlugin } from "./plugin.js";

await bootstrapAgentMain(analyticsPlugin);
