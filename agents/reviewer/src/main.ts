import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { reviewerPlugin } from "./plugin.js";

await bootstrapAgentMain(reviewerPlugin);
