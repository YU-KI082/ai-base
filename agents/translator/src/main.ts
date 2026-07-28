import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { translatorPlugin } from "./plugin.js";

await bootstrapAgentMain(translatorPlugin);
