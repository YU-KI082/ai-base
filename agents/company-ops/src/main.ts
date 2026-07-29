import { bootstrapAgentMain } from "@ai-base/agents-sdk";
import { companyOpsPlugin } from "./plugin.js";

await bootstrapAgentMain(companyOpsPlugin);
