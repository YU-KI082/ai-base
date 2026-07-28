import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { selfHealingPlugin } from "./plugin.js";

await bootstrapAgentMain(selfHealingPlugin);
