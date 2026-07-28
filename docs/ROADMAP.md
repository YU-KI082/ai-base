# ROADMAP.md

## Now (shipped foundation)

- [x] Event-driven agent pipeline with human approval
- [x] Full domain Prisma schema
- [x] Admin ops UI (drafts, agents, workflows, ingest)
- [x] LLM provider registry: OpenAI, Anthropic/Claude, Gemini, Grok, local, mock
- [x] Knowledge Graph + Memory Layer + RAG (central Knowledge Layer)
- [x] Embedding providers: OpenAI, Voyage, Cohere, Jina, BGE, Ollama, mock
- [x] VectorStore port: postgres, pgvector alias, memory, Qdrant, Pinecone
- [x] Agent Marketplace (registry, permissions, deps, enable/update, free/paid/internal/community)
- [x] Design docs in `/docs`

## Next

- [x] Public MVP surfaces (tools/detail/compare/search/categories + SEO basics)
- [x] Affiliate redirect `/go/[id]` + admin CRUD
- [x] Social drafts admin (manual status; no network APIs yet)
- [ ] Supabase Auth (wire JWT; keep fail-closed until ready)
- [x] API rate limiting + CSRF tokens (in-process; Redis limiter for multi-node)
- [x] Public tools ISR + cache port (`@ai-base/cache`)
- [ ] Marketplace billing for paid agents (Stripe)
- [ ] Signed external publisher onboarding + package signing
- [ ] Scout source plugins: Product Hunt, GitHub, Hugging Face, RSS, X
- [ ] Designer image generation provider port
- [ ] Sitemap, robots, canonical, OGP rendering — **done for MVP**; expand OG images later
- [ ] End-to-end pipeline test against Postgres + Redis in CI
- [ ] Affiliate agent + Finance agent workers
- [ ] Live SNS publisher integrations
- [ ] Cache invalidation on publish; search trigram/OpenSearch; pgvector ANN
- [ ] Versioned Prisma migrations for production (stop relying on `db:push`)
## Later

- [ ] Kafka EventBus adapter (keep Redis Streams default)
- [ ] Multi-region deploy
- [ ] Browser extension / iOS / Android
- [ ] Public API + Marketplace
- [ ] Workflow Builder / AI Chat / AI Consultant
- [ ] Additional locales (ko, zh, es) on Translator + i18n tables

## Non-goals (near term)

- Rewriting agents to call vendor SDKs directly
- Publishing without human approval
- Throwaway MVP schemas that require migration rewrites
