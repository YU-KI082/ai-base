import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { publisherPlugin } from "./plugin.js";

await bootstrapAgentMain(publisherPlugin);
