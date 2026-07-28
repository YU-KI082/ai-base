import type { Repositories } from "@ai-base/database";
import { repos } from "@ai-base/database";
import {
  createEmbeddingProvider,
  type EmbeddingProvider,
} from "@ai-base/embeddings";
import { createVectorStore, type VectorStore } from "@ai-base/vector";
import { KnowledgeGraph, createKnowledgeGraph } from "./graph.js";
import { MemoryLayer, createMemoryLayer } from "./memory.js";
import { RagService, createRagService } from "./rag.js";

/**
 * Central Knowledge Layer facade injected into every AgentContext.
 * Graph + Memory + RAG share company knowledge across all agents.
 */
export class KnowledgeLayer {
  readonly graph: KnowledgeGraph;
  readonly memory: MemoryLayer;
  readonly rag: RagService;
  readonly embeddings: EmbeddingProvider;
  readonly vectors: VectorStore;

  constructor(options?: {
    repositories?: Repositories;
    embeddings?: EmbeddingProvider;
    vectors?: VectorStore;
  }) {
    const r = options?.repositories ?? repos;
    this.embeddings = options?.embeddings ?? createEmbeddingProvider();
    this.vectors =
      options?.vectors ??
      createVectorStore(
        process.env.VECTOR_BACKEND === "memory"
          ? "memory"
          : process.env.VECTOR_BACKEND,
      );
    this.graph = createKnowledgeGraph(r);
    this.memory = createMemoryLayer(r);
    this.rag = createRagService({
      embeddings: this.embeddings,
      vectors: this.vectors,
      repositories: r,
    });
  }

  /**
   * Build a decision context string for any agent.
   */
  async decisionContext(input: {
    agentKey: string;
    query: string;
    toolSlug?: string;
    toolId?: string;
  }): Promise<string> {
    const [memories, rag, graph] = await Promise.all([
      this.memory.contextPrompt({
        agentKey: input.agentKey,
        toolId: input.toolId,
      }),
      this.rag.contextPrompt(input.query),
      input.toolSlug
        ? this.graph.contextForTool(input.toolSlug).then((c) => c.summary)
        : Promise.resolve("No tool graph context."),
    ]);

    return [
      "## Knowledge Graph",
      graph,
      "",
      "## Agent Memory",
      memories,
      "",
      "## Retrieved Knowledge (RAG)",
      rag,
    ].join("\n");
  }
}

let singleton: KnowledgeLayer | undefined;

export function getKnowledgeLayer(): KnowledgeLayer {
  if (!singleton) singleton = new KnowledgeLayer();
  return singleton;
}

export function createKnowledgeLayer(
  options?: ConstructorParameters<typeof KnowledgeLayer>[0],
): KnowledgeLayer {
  return new KnowledgeLayer(options);
}
