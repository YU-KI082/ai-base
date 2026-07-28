import {
  repos,
  type KnowledgeEdgeRepository,
  type KnowledgeNodeRepository,
  type Repositories,
} from "@ai-base/database";

export type NodeType =
  | "tool"
  | "category"
  | "company"
  | "use_case"
  | "pricing"
  | "api"
  | "feature"
  | "persona"
  | "competitor_set"
  | "concept"
  | "document"
  | "other";

export type EdgeType =
  | "similar_to"
  | "competes_with"
  | "belongs_to"
  | "made_by"
  | "used_for"
  | "has_pricing"
  | "has_api"
  | "has_feature"
  | "alternative_to"
  | "related_to"
  | "mentions"
  | "derived_from";

/**
 * Shared company Knowledge Graph.
 * Agents read/write via this service — never via ad-hoc SQL in plugins.
 */
export class KnowledgeGraph {
  constructor(
    private readonly nodes: KnowledgeNodeRepository = repos.knowledgeNodes,
    private readonly edges: KnowledgeEdgeRepository = repos.knowledgeEdges,
  ) {}

  async upsertNode(input: {
    type: NodeType;
    key: string;
    label: string;
    description?: string;
    entityType?: string;
    entityId?: string;
    properties?: Record<string, unknown>;
  }) {
    return this.nodes.upsert({
      type: input.type,
      key: input.key,
      label: input.label,
      description: input.description,
      entityType: input.entityType,
      entityId: input.entityId,
      properties: (input.properties ?? {}) as never,
    });
  }

  async link(input: {
    fromType: NodeType;
    fromKey: string;
    toType: NodeType;
    toKey: string;
    type: EdgeType;
    weight?: number;
    properties?: Record<string, unknown>;
  }) {
    const from = await this.nodes.findByKey(input.fromType, input.fromKey);
    const to = await this.nodes.findByKey(input.toType, input.toKey);
    if (!from || !to) {
      throw new Error(
        `Cannot link missing nodes: ${input.fromType}:${input.fromKey} -> ${input.toType}:${input.toKey}`,
      );
    }
    return this.edges.upsert({
      fromNodeId: from.id,
      toNodeId: to.id,
      type: input.type,
      weight: input.weight,
      properties: (input.properties ?? {}) as never,
    });
  }

  async upsertToolGraph(input: {
    toolId: string;
    slug: string;
    name: string;
    description?: string;
    categoryKeys?: string[];
    companyKey?: string;
    companyName?: string;
    pricingKey?: string;
    hasApi?: boolean;
    useCases?: string[];
    similarSlugs?: string[];
    competitorSlugs?: string[];
  }) {
    const toolNode = await this.upsertNode({
      type: "tool",
      key: input.slug,
      label: input.name,
      description: input.description,
      entityType: "ai_tool",
      entityId: input.toolId,
    });

    for (const categoryKey of input.categoryKeys ?? []) {
      await this.upsertNode({
        type: "category",
        key: categoryKey,
        label: categoryKey,
        entityType: "category",
        entityId: categoryKey,
      });
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "category",
        toKey: categoryKey,
        type: "belongs_to",
      });
    }

    if (input.companyKey) {
      await this.upsertNode({
        type: "company",
        key: input.companyKey,
        label: input.companyName ?? input.companyKey,
      });
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "company",
        toKey: input.companyKey,
        type: "made_by",
      });
    }

    if (input.pricingKey) {
      await this.upsertNode({
        type: "pricing",
        key: input.pricingKey,
        label: input.pricingKey,
      });
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "pricing",
        toKey: input.pricingKey,
        type: "has_pricing",
      });
    }

    if (input.hasApi) {
      const apiKey = `${input.slug}:api`;
      await this.upsertNode({
        type: "api",
        key: apiKey,
        label: `${input.name} API`,
      });
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "api",
        toKey: apiKey,
        type: "has_api",
      });
    }

    for (const useCase of input.useCases ?? []) {
      const key = useCase.toLowerCase().replace(/\s+/g, "-");
      await this.upsertNode({
        type: "use_case",
        key,
        label: useCase,
      });
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "use_case",
        toKey: key,
        type: "used_for",
      });
    }

    for (const similar of input.similarSlugs ?? []) {
      const exists = await this.nodes.findByKey("tool", similar);
      if (!exists) continue;
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "tool",
        toKey: similar,
        type: "similar_to",
      });
    }

    for (const competitor of input.competitorSlugs ?? []) {
      const exists = await this.nodes.findByKey("tool", competitor);
      if (!exists) continue;
      await this.link({
        fromType: "tool",
        fromKey: input.slug,
        toType: "tool",
        toKey: competitor,
        type: "competes_with",
      });
    }

    return toolNode;
  }

  async neighbors(type: NodeType, key: string, edgeTypes?: EdgeType[]) {
    const node = await this.nodes.findByKey(type, key);
    if (!node) return null;
    return this.nodes.getWithNeighbors(node.id, edgeTypes);
  }

  async contextForTool(slug: string): Promise<{
    node: Awaited<ReturnType<KnowledgeNodeRepository["findByKey"]>>;
    summary: string;
    related: Array<{ edge: string; type: string; key: string; label: string }>;
  }> {
    const graph = await this.neighbors("tool", slug);
    if (!graph) {
      return { node: null, summary: `No knowledge node for tool:${slug}`, related: [] };
    }
    const related = [
      ...graph.edgesFrom.map((e) => ({
        edge: e.type,
        type: e.toNode.type,
        key: e.toNode.key,
        label: e.toNode.label,
      })),
      ...graph.edgesTo.map((e) => ({
        edge: e.type,
        type: e.fromNode.type,
        key: e.fromNode.key,
        label: e.fromNode.label,
      })),
    ];
    const summary = [
      `Tool ${graph.label} (${graph.key})`,
      graph.description ?? "",
      related.length
        ? `Related: ${related.map((r) => `${r.edge}:${r.type}/${r.key}`).join(", ")}`
        : "No relations yet",
    ]
      .filter(Boolean)
      .join("\n");
    return { node: graph, summary, related };
  }
}

export function createKnowledgeGraph(_repos: Repositories = repos) {
  return new KnowledgeGraph(_repos.knowledgeNodes, _repos.knowledgeEdges);
}
