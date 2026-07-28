# FOLDER_STRUCTURE.md

> Keep this file updated when packages/apps/agents are added or renamed.

```text
/
├── apps/
│   └── web/                         # Next.js public + admin + /api/v1
│       └── app/
│           ├── (public)/            # landing, tools
│           ├── (admin)/admin/       # ops UI
│           └── api/v1/              # versioned HTTP API
├── agents/
│   ├── scout/
│   ├── reviewer/
│   ├── writer/
│   ├── designer/
│   ├── translator/
│   ├── seo/
│   ├── publisher/
│   ├── social/
│   ├── analytics/
│   ├── planner/
│   └── Dockerfile                   # shared worker image pattern
├── packages/
│   ├── database/                    # Prisma schema + repositories
│   ├── events/                      # CloudEvents, bus, outbox relay
│   ├── agents-sdk/                  # plugin runtime (+ ctx.knowledge)
│   ├── knowledge/                   # Knowledge Graph + Memory + RAG facade
│   ├── embeddings/                  # embedding provider registry
│   ├── vector/                      # VectorStore port (postgres/qdrant/pinecone/…)
│   ├── marketplace/                 # Agent Registry + Marketplace
│   ├── llm/                         # provider registry (openai/claude/gemini/grok/local/mock)
│   ├── auth/                        # RBAC
│   ├── i18n/                        # en/ja dictionaries
│   ├── config/                      # shared tsconfig
│   └── ui/                          # shared UI helpers
├── infrastructure/
│   ├── docker/docker-compose.yml    # postgres + redis
│   └── n8n/                         # reserved
├── docs/                            # design docs (this folder)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Package dependency direction

```text
agents/* → agents-sdk → events, database, llm, i18n, knowledge, marketplace
apps/web → auth, cache, database, events, i18n, llm, marketplace
packages/knowledge → database, embeddings, vector
packages/marketplace → database
packages/cache → (ioredis when CACHE_BACKEND=redis)
llm → (no workspace deps; pure providers)
```

Agents must not depend on `apps/web`.
