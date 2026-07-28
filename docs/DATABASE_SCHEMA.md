# DATABASE_SCHEMA.md

> Mirrors `packages/database/prisma/schema.prisma`. Update both together.

## Engine

- PostgreSQL (Supabase-compatible)
- ORM: Prisma
- Access: repositories in `packages/database/src/repositories.ts`

## Enums (selected)

| Enum | Values |
|------|--------|
| `Locale` | `en`, `ja` |
| `DraftStatus` | `building`, `pending_approval`, `approved`, `rejected`, `published` |
| `WorkflowState` | `started` … `published` / `failed` |
| `ContentStatus` | `draft`, `published`, `archived` |
| `AgentStatus` | `active`, `disabled`, `degraded` |
| `PricingModel` | `free`, `freemium`, `paid`, `enterprise`, `unknown` |

## Core tables

### Identity & RBAC
- `users`, `roles`, `permissions`, `role_permissions`, `user_roles`
- `audit_logs`

### Content (locale-aware)
- `categories` + `category_translations`
- `ai_tools` + `ai_tool_translations` + `ai_tool_media` + `ai_tool_categories`
- `affiliate_links`
- `comparisons` + `comparison_translations` + `comparison_items`
- `reviews`, `news` + translations, `articles` + translations
- `social_posts`

### Agent operating system
- `agents` — registry (`key`, `version`, `status`, `config` JSONB, `subscribe[]`, `publish[]`, heartbeat)
- `agent_plugins`
- `agent_runs` — every invocation with cost/tokens
- `workflows` + `workflow_steps`
- `drafts` — pre-publish payload (JSONB) + status machine
- `approvals` — human decisions
- `tool_candidates` — scout ingest with fingerprint dedupe
- `events_outbox` — durable event publish
- `event_consumptions` — `(consumer_group, event_id)` unique
- `logs`, `settings`, `analytics`, `revenue`

### Knowledge Layer
- `knowledge_nodes` / `knowledge_edges` — company Knowledge Graph
- `agent_memories` — shared Memory Layer
- `knowledge_documents` / `knowledge_chunks` — RAG metadata
- `vector_records` — default Postgres vector payload store

### Agent Marketplace
- `marketplace_agent_packages` — catalog (free/paid/internal/community)
- `marketplace_agent_versions` — versioned manifests
- `marketplace_agent_permissions` — declared permissions
- `marketplace_agent_dependencies` — agent dependency edges
- `marketplace_installations` — installed package ↔ runtime agent

See [KNOWLEDGE_LAYER.md](./KNOWLEDGE_LAYER.md) and [AGENT_MARKETPLACE.md](./AGENT_MARKETPLACE.md).

## Draft status machine

```text
building → pending_approval → approved → published
                 ↘ rejected → building (revise)
```

## Agent config (JSONB) conventions

Per-agent LLM override (optional):

```json
{
  "llmProvider": "anthropic",
  "llmModel": "claude-3-5-haiku-latest",
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-5-haiku-latest",
    "temperature": 0.2
  }
}
```

Global default remains `LLM_PROVIDER` / `LLM_MODEL` env vars.

## Migrations

```bash
pnpm db:generate
pnpm db:push          # local iteration only
pnpm db:migrate       # production path — prefer versioned SQL migrations
pnpm db:seed
```

> Note: the repo may not yet contain committed SQL migration history (only `migration_lock.toml`). Use `db:push` locally; before production cutover, baseline with `prisma migrate` and stop relying on push. Indexes of note: `ai_tools(homepage_url)`, `ai_tools(status, published_at)`.
