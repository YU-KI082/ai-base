import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { autoImprovePlugin } from "./plugin.js";

await bootstrapAgentMain(autoImprovePlugin);
