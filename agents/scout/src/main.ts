import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { scoutPlugin } from "./plugin.js";

await bootstrapAgentMain(scoutPlugin);
