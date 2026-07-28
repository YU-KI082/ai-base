import {
  repos,
  type AgentMemoryRepository,
  type Repositories,
} from "@ai-base/database";

export type MemoryKind =
  | "run_success"
  | "run_failure"
  | "improvement"
  | "observation"
  | "decision"
  | "feedback"
  | "fact";

/**
 * Shared Memory Layer — agents record outcomes and recall lessons.
 */
export class MemoryLayer {
  constructor(private readonly memories: AgentMemoryRepository = repos.memories) {}

  async remember(input: {
    kind: MemoryKind;
    agentKey: string;
    title: string;
    content: string;
    scope?: "global" | "agent" | "workflow" | "tool" | "correlation";
    workflowId?: string;
    correlationId?: string;
    toolId?: string;
    nodeId?: string;
    metadata?: Record<string, unknown>;
    importance?: number;
  }) {
    return this.memories.create({
      kind: input.kind,
      scope: input.scope ?? "agent",
      agentKey: input.agentKey,
      workflowId: input.workflowId,
      correlationId: input.correlationId,
      toolId: input.toolId,
      nodeId: input.nodeId,
      title: input.title,
      content: input.content,
      metadata: (input.metadata ?? {}) as never,
      importance: input.importance,
    });
  }

  async recordSuccess(input: {
    agentKey: string;
    title: string;
    content: string;
    correlationId?: string;
    workflowId?: string;
    toolId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.remember({
      ...input,
      kind: "run_success",
      importance: 0.6,
    });
  }

  async recordFailure(input: {
    agentKey: string;
    title: string;
    content: string;
    correlationId?: string;
    workflowId?: string;
    toolId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.remember({
      ...input,
      kind: "run_failure",
      importance: 0.85,
    });
  }

  async recordImprovement(input: {
    agentKey: string;
    title: string;
    content: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.remember({
      ...input,
      kind: "improvement",
      scope: "global",
      importance: 0.9,
    });
  }

  async recall(input: {
    agentKey: string;
    kinds?: MemoryKind[];
    toolId?: string;
    correlationId?: string;
    take?: number;
  }) {
    const rows = await this.memories.recall({
      agentKey: input.agentKey,
      kinds: input.kinds,
      toolId: input.toolId,
      correlationId: input.correlationId,
      take: input.take ?? 10,
    });
    await Promise.all(rows.map((r) => this.memories.touch(r.id)));
    return rows;
  }

  async contextPrompt(input: {
    agentKey: string;
    toolId?: string;
    take?: number;
  }): Promise<string> {
    const rows = await this.recall({
      agentKey: input.agentKey,
      toolId: input.toolId,
      take: input.take ?? 8,
    });
    if (!rows.length) return "No prior memories.";
    return rows
      .map(
        (r) =>
          `- [${r.kind}] ${r.title}: ${r.content.slice(0, 400)} (importance=${r.importance})`,
      )
      .join("\n");
  }
}

export function createMemoryLayer(_repos: Repositories = repos) {
  return new MemoryLayer(_repos.memories);
}
