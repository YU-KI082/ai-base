# AGENT_ARCHITECTURE.md

> Implementation: `packages/agents-sdk`, `agents/*`, `packages/llm`.

## Plugin contract

```ts
interface AgentPlugin {
  manifest: {
    key: string
    version: string
    displayName: Record<"ja" | "en", string>
    subscribe: string[]
    publish: string[]
    capabilities: string[]
  }
  handle(ctx: AgentContext, event: AiBaseEvent): Promise<void>
}
```

`AgentContext` exposes: `db`, `repos`, `llm` (`LlmProvider`), `knowledge` (`KnowledgeLayer`), `logger`, `config`, `publish` (outbox), `localeTargets`.

## Knowledge (required for judgments)

- All agents receive `ctx.knowledge` (Graph + Memory + RAG).
- Prefer `ctx.knowledge.decisionContext(...)` before LLM generation.
- Do not bypass Knowledge Layer with one-off SQL for graph/memory/RAG.
- Details: [KNOWLEDGE_LAYER.md](./KNOWLEDGE_LAYER.md)

## Marketplace

- Agents register into the Agent Marketplace on boot (idempotent).
- Declare `permissions`, `requiredProviders`, `dependencies` in the manifest when possible.
- Details: [AGENT_MARKETPLACE.md](./AGENT_MARKETPLACE.md)

## LLM independence (required)

- Plugins call `ctx.llm.complete(...)` only.
- Plugins must **never** import OpenAI / Anthropic / Gemini / Grok SDKs.
- Provider selection:
  1. Agent `config.llmProvider` / `config.llm` (DB)
  2. Else worker default from `LLM_PROVIDER` env via `createLlmProvider()`
- Supported providers: `openai`, `anthropic` (`claude` alias), `gemini`, `grok`, `local`, `mock`
- Extension: `registerLlmProvider(id, factory)` in `@ai-base/llm`

## Pipeline agents

| Key | Subscribes | Publishes | Notes |
|-----|------------|-----------|-------|
| scout | `ingest.manual.requested.v1` | `tool.candidate.created.v1` | Starts workflow |
| reviewer | `tool.candidate.created.v1` | `tool.reviewed.v1` | Dedupe / quality |
| writer | `tool.reviewed.v1`, `content.rejected.v1` | `content.draft.generated.v1` | Uses LLM |
| designer | `content.draft.generated.v1` | `content.assets.ready.v1` | Asset records |
| translator | `content.draft.generated.v1` | `content.translated.v1` | Uses LLM for gaps |
| seo | assets + translated | `content.seo.ready.v1`, `content.pending_approval.v1` | Barrier join |
| publisher | `content.approved.v1` | `content.published.v1` | Human gate only |
| social | `content.published.v1` | — | Social drafts |
| analytics | `content.published.v1` | — | Metrics events |
| planner | published + failed reviews | — | Recommendations |

## Human gate

Approval is **not** an LLM agent. Workflow step uses `agentKey: "human"` / `stepKey: "approval"`. Admin API emits `content.approved.v1` / `content.rejected.v1` via transactional `withOutboxEvent`.

## Adding an agent

1. Create `agents/<name>` with plugin + `main.ts`
2. Declare subscribe/publish
3. Use `ctx.llm` if generation is needed
4. Deploy worker — registry upserts on boot
5. Document here + [EVENT_SYSTEM.md](./EVENT_SYSTEM.md)
