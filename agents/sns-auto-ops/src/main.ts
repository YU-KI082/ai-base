import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { snsAutoOpsPlugin } from "./plugin.js";

await bootstrapAgentMain(snsAutoOpsPlugin);
