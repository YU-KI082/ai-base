import {
  prisma,
  repos,
  type Repositories,
  type PrismaClient,
  type Prisma,
} from "@ai-base/database";
import {
  createEventBus,
  enqueueEvent,
  type AiBaseEvent,
  type EventBus,
} from "@ai-base/events";
import {
  createLlmProvider,
  createLlmProviderFromAgentConfig,
  type LlmProvider,
} from "@ai-base/llm";
import {
  createKnowledgeLayer,
  type KnowledgeLayer,
} from "@ai-base/knowledge";
import {
  createAgentRegistry,
  type MarketplaceAgentManifest,
} from "@ai-base/marketplace";
import type { AgentPlugin, AgentContext, AgentLogger } from "./types.js";

function createLogger(
  source: string,
  repositories: Repositories,
  correlationId?: string,
): AgentLogger {
  const write = async (
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ) => {
    console.log(JSON.stringify({ level, source, message, context, correlationId }));
    await repositories.logs.write({
      level,
      source,
      message,
      context: (context ?? {}) as Prisma.InputJsonValue,
      correlationId,
    });
  };
  return {
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}

function toMarketplaceManifest(plugin: AgentPlugin): MarketplaceAgentManifest {
  const m = plugin.manifest;
  return {
    key: m.key,
    version: m.version,
    name: m.name ?? m.displayName,
    description: m.description,
    subscribe: m.subscribe,
    publish: m.publish,
    capabilities: m.capabilities,
    permissions: m.permissions,
    requiredProviders: m.requiredProviders,
    dependencies: m.dependencies,
    marketplace: m.marketplace ?? {
      visibility: "internal",
      listingStatus: "published",
      tags: ["builtin"],
    },
  };
}

export type RunAgentOptions = {
  plugin: AgentPlugin;
  bus?: EventBus;
  db?: PrismaClient;
  repositories?: Repositories;
  llm?: LlmProvider;
  knowledge?: KnowledgeLayer;
  consumerName?: string;
};

export async function registerAgent(plugin: AgentPlugin) {
  const registry = createAgentRegistry();
  const result = await registry.registerPlugin(toMarketplaceManifest(plugin), {
    install: true,
  });
  return result.agent;
}

export async function runAgentWorker(options: RunAgentOptions): Promise<{
  stop: () => Promise<void>;
}> {
  const plugin = options.plugin;
  const bus = options.bus ?? createEventBus();
  const db = options.db ?? prisma;
  const repositories = options.repositories ?? repos;
  const llm = options.llm ?? createLlmProvider();
  const knowledge =
    options.knowledge ?? createKnowledgeLayer({ repositories });
  const consumerName =
    options.consumerName ?? `${plugin.manifest.key}-${process.pid}`;

  const agentRow = await registerAgent(plugin);
  await repositories.logs.write({
    level: "info",
    source: `agent:${plugin.manifest.key}`,
    message: "agent registered",
    context: { version: plugin.manifest.version },
  });

  const heartbeat = setInterval(() => {
    void repositories.agents.heartbeat(plugin.manifest.key).catch(() => undefined);
  }, 15_000);

  const subscription = await bus.subscribe(
    {
      group: `agent:${plugin.manifest.key}`,
      consumer: consumerName,
      topics: plugin.manifest.subscribe,
    },
    async (event) => {
      await processAgentEvent({
        plugin,
        event,
        db,
        repositories,
        llm,
        knowledge,
        agentId: agentRow.id,
      });
    },
  );

  console.log(
    `[agent:${plugin.manifest.key}] listening to ${plugin.manifest.subscribe.join(", ")}`,
  );

  return {
    stop: async () => {
      clearInterval(heartbeat);
      await subscription.stop();
    },
  };
}

/** Exported for unit tests — production path is `runAgentWorker`. */
export async function processAgentEvent(input: {
  plugin: AgentPlugin;
  event: AiBaseEvent;
  db: PrismaClient;
  repositories: Repositories;
  llm: LlmProvider;
  knowledge: KnowledgeLayer;
  agentId: string;
}) {
  const { plugin, event, db, repositories, llm, knowledge, agentId } = input;
  const consumerGroup = `agent:${plugin.manifest.key}`;

  // Check disabled before claiming so re-enable can still process the event.
  const agentRow = await repositories.agents.findByKey(plugin.manifest.key);
  if (agentRow?.status === "disabled") {
    return;
  }

  const claimed = await repositories.consumptions.tryClaim(
    consumerGroup,
    event.id,
  );
  if (!claimed) {
    return;
  }

  const workflowId =
    typeof event.data === "object" &&
    event.data &&
    "workflowId" in event.data &&
    typeof (event.data as { workflowId?: unknown }).workflowId === "string"
      ? (event.data as { workflowId: string }).workflowId
      : undefined;

  const run = await repositories.agentRuns.start({
    agentKey: plugin.manifest.key,
    agentId,
    correlationId: event.correlationid,
    causationId: event.id,
    eventId: event.id,
    workflowId,
    input: event as never,
  });

  const logger = createLogger(
    `agent:${plugin.manifest.key}`,
    repositories,
    event.correlationid,
  );
  const agentConfig = (agentRow?.config as Record<string, unknown>) ?? {};
  const hasAgentLlmOverride =
    typeof agentConfig.llmProvider === "string" ||
    (typeof agentConfig.llm === "object" &&
      agentConfig.llm !== null &&
      "provider" in (agentConfig.llm as object));
  const activeLlm = hasAgentLlmOverride
    ? createLlmProviderFromAgentConfig(agentConfig)
    : llm;

  const ctx: AgentContext = {
    agentKey: plugin.manifest.key,
    runId: run.id,
    correlationId: event.correlationid,
    db,
    repos: repositories,
    llm: activeLlm,
    knowledge,
    logger,
    config: agentConfig,
    localeTargets: ["en", "ja"],
    publish: async (outgoing) => {
      await enqueueEvent(outgoing);
    },
  };

  try {
    await plugin.handle(ctx, event);
    await repositories.agentRuns.complete(run.id, {
      ok: true,
      provider: activeLlm.name,
    });
    await knowledge.memory.recordSuccess({
      agentKey: plugin.manifest.key,
      title: `Completed ${event.type}`,
      content: `Run ${run.id} completed for ${event.type}`,
      correlationId: event.correlationid,
      workflowId,
      metadata: { eventType: event.type, runId: run.id },
    });
    await logger.info("run completed", {
      eventType: event.type,
      runId: run.id,
      provider: activeLlm.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Release claim first so Redis pending retry can re-process even if
    // subsequent bookkeeping fails (at-least-once delivery).
    await repositories.consumptions.releaseClaim(consumerGroup, event.id);
    await repositories.agentRuns.fail(run.id, message);
    await knowledge.memory.recordFailure({
      agentKey: plugin.manifest.key,
      title: `Failed ${event.type}`,
      content: message,
      correlationId: event.correlationid,
      workflowId,
      metadata: { eventType: event.type, runId: run.id },
    });
    await logger.error("run failed", { eventType: event.type, error: message });
    throw error;
  }
}

export async function bootstrapAgentMain(plugin: AgentPlugin) {
  const worker = await runAgentWorker({ plugin });
  const shutdown = async () => {
    await worker.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}
