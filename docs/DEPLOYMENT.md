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

## Vercel (public web MVP)

1. Push this repo to GitHub.
2. [Vercel](https://vercel.com) → Import project → select the repo.
3. **Root Directory:** `apps/web` (uses `apps/web/vercel.json`).
4. Set environment variables (Production + Preview as needed):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres (use pooler URL on serverless; Prisma needs `?pgbouncer=true` when using transaction pooler) |
| `REDIS_URL` | Optional for MVP if `CACHE_BACKEND=memory` |
| `CACHE_BACKEND` | `memory` for single-region MVP; `redis` when multi-instance |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, e.g. `https://your-domain.vercel.app` |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `ja` |
| `ADMIN_OPS_SECRET` | **Required for production admin** — 16+ char secret used at `/login` |
| `COOKIE_SECURE` | Optional `true` to force Secure cookies; on Vercel HTTPS is automatic |
| `ADMIN_DEV_BYPASS` | **Do not set** in Production |
| `LLM_PROVIDER` | Needed only when running agents/outbox for new article generation |

Build uses `pnpm` (not `turbo run`) so paths with spaces work; `apps/web/vercel.json` is the source of truth when Root Directory is `apps/web`.

5. Deploy. After first deploy, run migrations/seed against the production DB from CI or locally:

```bash
DATABASE_URL=... pnpm db:push   # or pnpm db:migrate for versioned migrations
DATABASE_URL=... pnpm db:seed   # publishes demo tools + JA CTAs
```

6. Open `/login`, enter `ADMIN_OPS_SECRET`, then manage affiliates at `/admin/affiliate`.
7. Replace seed `direct` (公式サイト) URLs with real ASP partner links for monetization.
8. Agents / outbox are **not** hosted on Vercel — run them on Docker/K8s when you need live AI draft→publish. Seeded tools are enough for public browse + `/go` tracking.

## Production posture (target)

| Component | Target |
|-----------|--------|
| Web | Vercel Next.js (`apps/web`) + CDN |
| DB | Supabase / Neon / managed PostgreSQL + pooler |
| Redis | Managed Redis (Streams + cache) when agents run |
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