import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { snsOauthPlugin } from "./plugin.js";

await bootstrapAgentMain(snsOauthPlugin);
