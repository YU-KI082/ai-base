# DEPLOYMENT.md

## Local development

```bash
cp .env.example .env
pnpm install
pnpm docker:up                 # Postgres 5432, Redis 6379
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm --filter @ai-base/events outbox:dev
pnpm agents:dev                # all agent workers
pnpm --filter @ai-base/web dev # http://localhost:3000
```

## Processes (minimum)

| Process | Command | Role |
|---------|---------|------|
| Postgres + Redis | `pnpm docker:up` | State + streams |
| Outbox relay | `pnpm --filter @ai-base/events outbox:dev` | DB → bus |
| Agent workers | `pnpm agents:dev` | Pipeline |
| Web/API | `pnpm --filter @ai-base/web dev` | UI + admin + API |

## Environment

See `.env.example`. Critical:

- `DATABASE_URL`, `REDIS_URL`
- `LLM_PROVIDER` (`openai` \| `anthropic` \| `gemini` \| `grok` \| `local` \| `mock`)
- Provider keys as needed (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROK_API_KEY`, …)
- `EMBEDDING_PROVIDER` / `VECTOR_BACKEND` (see [KNOWLEDGE_LAYER.md](./KNOWLEDGE_LAYER.md))
- `ADMIN_DEV_BYPASS=true` for **local only** (`NODE_ENV !== production`; ignored in production)
- `CACHE_BACKEND=memory|redis`, `OUTBOX_MAX_ATTEMPTS`
- `NEXT_PUBLIC_SITE_URL` for canonical URLs / sitemap / Open Graph

## Production posture (target)

| Component | Target |
|-----------|--------|
| Web | Vercel / Cloudflare-compatible Next.js + CDN |
| DB | Supabase PostgreSQL + pooler (multi-region later) |
| Redis | Managed Redis (Streams + cache) |
| Agents | Docker / K8s Deployments per agent key |
| Outbox relay | Dedicated Deployment (HA) |
| Secrets | Env / secret manager — never store raw keys in DB UI |
| CI | GitHub Actions — typecheck, unit tests, migrate |
| Auth | Supabase JWT (fail-closed until configured) |

## Agent container

Build pattern: `agents/Dockerfile` with `AGENT=<key>`.

Horizontal scale: increase replicas; consumer groups provide competing consumers.

## Health

- `GET /api/v1/agents/health` — liveness `{ ok: true }`
- `GET /api/v1/agents/health?detailed=1` — registry heartbeats (**admin auth required**)
- Admin dashboard — failed runs, pending approvals

## Schema changes

Local iteration may use `pnpm db:push`. Production must use versioned Prisma migrations (`pnpm db:migrate`) — see [SCALE.md](./SCALE.md).

## Scale

See [SCALE.md](./SCALE.md) for 10M PV / 1M user readiness.