# SCALE.md

Scale readiness review for **10M page views / month** and **~1M registered users**.

Status legend: **Ready** · **Partial** · **Gap** (must fix before that load).

## Verdict

The architecture (event-driven agents, outbox, Redis Streams consumer groups, Next.js + Postgres) **can** reach this scale, but **not as currently deployed defaults**. Treat the items below as the production hardening checklist — not optional polish.

## Traffic model (order-of-magnitude)

| Surface | Assumed load | Primary bottleneck |
|---------|--------------|--------------------|
| Public tool pages | Majority of 10M PV | Edge cache / ISR / CDN |
| Public API (`/api/v1/tools`, search) | Burst reads | Cache + DB indexes |
| Admin | Tiny vs public | Auth + CSRF (already gated) |
| Agent pipeline | Write-path; not PV-bound | Workers + Redis + outbox relay |

## Layer review

### Web / Core Web Vitals — Partial

| Item | Status | Notes |
|------|--------|-------|
| ISR on `/tools`, `/tools/[slug]` | Ready | `revalidate = 60` + `@ai-base/cache` |
| CDN / `Cache-Control` on tools API | Partial | Set; put Cloudflare/Fastly in front |
| Image/CDN for media | Gap | Serve screenshots via object storage + CDN |
| Edge SSR regions | Partial | Prefer Vercel/CF near users; keep origin thin |

### API / Auth — Partial

| Item | Status | Notes |
|------|--------|-------|
| Fail-closed production auth | Ready | Bypass disabled in production |
| CSRF + rate limit | Ready (single node) | Swap MemoryRateLimiter → Redis for multi-instance |
| Supabase JWT verification | Gap | Port reserved; implement before public accounts |
| Search (`contains` ILIKE) | Gap | Add trigram/GIN or OpenSearch before 1M users |

### Data / Postgres — Partial

| Item | Status | Notes |
|------|--------|-------|
| Indexes on `status`, `homepage_url`, `published_at` | Ready | Added/confirmed in schema |
| Pagination on published tools | Ready | `take`/`skip` capped |
| Connection pooling | Gap | PgBouncer / Supabase pooler required |
| Read replicas | Gap | Route public reads to replicas |
| Prisma `db push` vs migrations | Gap | Ship versioned SQL migrations for prod |
| Vector ANN | Gap | JSON cosine over 10k rows will not scale — use pgvector/Qdrant |

### Events / Agents — Partial

| Item | Status | Notes |
|------|--------|-------|
| Outbox + relay | Ready | Approve/reject transactional via `withOutboxEvent` |
| Outbox max attempts / DLQ logging | Ready | `OUTBOX_MAX_ATTEMPTS` |
| Claim release on failure | Ready | Retries no longer poison-pilled |
| Horizontal agent replicas | Ready | Redis consumer groups |
| Multi-region bus | Gap | Single Redis today; plan Redis Cluster / sharded streams |

### Cache / Redis — Partial

| Item | Status | Notes |
|------|--------|-------|
| `@ai-base/cache` port (memory \| redis) | Ready | Set `CACHE_BACKEND=redis` in prod |
| Cache invalidation on publish | Gap | Bust `page:tool:*` / `tools:published:*` on `content.published` |
| Session store for 1M users | Gap | Redis sessions when AuthN lands |

### Knowledge / RAG — Gap at 10M content scale

Current Postgres JSON embedding scan is a prototype. Before large RAG traffic: pgvector IVFFlat/HNSW or Qdrant/Pinecone, batched upserts, namespace sharding.

## What must be true for 10M PV / 1M users

1. **CDN + ISR** for all public HTML; origin hit rate &lt; 5% for tool pages  
2. **Redis cache** for API list/detail; publish-time invalidation  
3. **Pooled Postgres** + read replicas for public GETs  
4. **Real AuthN** (no bypass) + Redis rate limits at the edge  
5. **Search** not ILIKE-primary  
6. **Vector ANN** for RAG  
7. **Observability**: p95 latency, outbox lag, consumer pending depth, error budgets  
8. **Capacity tests**: k6/Locust against staging with production-like data volume  

## Explicit non-goals of this quality pass

- No new product features  
- No full repository-file split (still tracked as maintainability debt)  
- No live Supabase JWT (fail-closed stub remains until credentials exist)

## Related docs

- [SECURITY.md](./SECURITY.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [EVENT_SYSTEM.md](./EVENT_SYSTEM.md)
- [ROADMAP.md](./ROADMAP.md)
