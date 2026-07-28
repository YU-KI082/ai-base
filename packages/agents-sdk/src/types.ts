import type { Locale } from "@ai-base/i18n";
import type { LlmProvider } from "@ai-base/llm";
import type { AiBaseEvent } from "@ai-base/events";
import type { PrismaClient, Repositories } from "@ai-base/database";
import type { KnowledgeLayer } from "@ai-base/knowledge";
import type {
  AgentDependencySpec,
  LocaleText,
  MarketplaceVisibility,
  RequiredProviders,
} from "@ai-base/marketplace";

/**
 * Runtime plugin manifest.
 * Additive marketplace fields are optional — existing agents keep working.
 */
export type AgentManifest = {
  key: string;
  version: string;
  displayName: Record<"ja" | "en", string>;
  /** Preferred over displayName for marketplace registration */
  name?: LocaleText;
  description?: LocaleText;
  subscribe: string[];
  publish: string[];
  capabilities: string[];
  permissions?: string[];
  requiredProviders?: RequiredProviders;
  dependencies?: AgentDependencySpec[];
  marketplace?: {
    visibility?: MarketplaceVisibility;
    listingStatus?: "draft" | "published" | "archived" | "suspended";
    tags?: string[];
    homepageUrl?: string;
    priceUsd?: number | null;
  };
};

export type AgentLogger = {
  info: (message: string, context?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, context?: Record<string, unknown>) => Promise<void>;
  error: (message: string, context?: Record<string, unknown>) => Promise<void>;
};

export type AgentContext = {
  agentKey: string;
  runId: string;
  correlationId: string;
  db: PrismaClient;
  repos: Repositories;
  llm: LlmProvider;
  /** Shared company Knowledge Layer (graph + memory + RAG) */
  knowledge: KnowledgeLayer;
  logger: AgentLogger;
  config: Record<string, unknown>;
  localeTargets: Locale[];
  publish: (event: AiBaseEvent) => Promise<void>;
};

export interface AgentPlugin {
  manifest: AgentManifest;
  handle(ctx: AgentContext, event: AiBaseEvent): Promise<void>;
}
