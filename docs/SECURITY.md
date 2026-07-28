# SECURITY.md

## Principles

1. Least privilege via RBAC (`roles` / `permissions`)
2. Secrets only in environment / secret managers
3. Human approval required before public publish
4. Audit every sensitive admin action
5. Defense in depth: parameterized SQL (Prisma), CSRF double-submit, rate limits, XSS-safe React rendering

## AuthN / AuthZ

- Package: `@ai-base/auth`
- Admin **API** routes: `withAdmin` → `requireAdmin` + `hasPermission` + CSRF + rate limit
- Admin **UI**: Next.js `middleware.ts` + admin layout RSC gate
- **RBAC**: exact permission match (seeded admin role holds all permission keys)
- Local only: `ADMIN_DEV_BYPASS=true` **and** `NODE_ENV !== "production"` (localhost-oriented). Ignored/fail-closed in production.
- Production: Bearer / session via Supabase JWT (port reserved; currently fails closed until configured)
- Login messaging page: `/login`

### Seeded permissions

`admin.access`, `drafts.read`, `drafts.approve`, `agents.read`, `agents.manage`, `workflows.read`, `tools.read`, `logs.read`, `settings.manage`

## CSRF

- Cookie: `aibase_csrf` (SameSite=Strict, readable by JS for double-submit)
- Header: `x-csrf-token` must equal cookie on mutating admin requests
- Bearer-authenticated machine clients skip cookie CSRF
- Admin client helpers: `apps/web/lib/admin-fetch.ts`

## Rate limiting

- In-process limiters in `@ai-base/auth` (`adminMutationLimiter`, `publicApiLimiter`)
- Multi-instance production: replace with Redis-backed limiter implementing the same interface
- Env: `RATE_LIMIT_ADMIN_MUTATION_PER_MIN`, `RATE_LIMIT_PUBLIC_PER_MIN`

## Secrets

| Secret | Usage |
|--------|-------|
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | Event bus + optional cache |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `GROK_API_KEY` | LLM providers |
| `SUPABASE_SERVICE_ROLE_KEY` | Server auth (future) |

- Agent config API rejects keys matching `/api[_-]?key|secret|password|token/i`
- Mock LLM/embedding fallback is **disabled in production** (`NODE_ENV=production`)

## Agent security

- Agents are not publicly reachable; they consume bus events
- Disable via Admin without redeploying peers (`agents.status`)
- Idempotent consumption per consumer group; **claims are released on handler failure** so Redis pending retries work
- Public `GET /api/v1/agents/health` is liveness-only; `?detailed=1` requires admin

## Data protection

- SQL injection: Prisma parameterized queries; jsonb merge uses bound `$1`/`$2` parameters
- XSS: React escaping; no `dangerouslySetInnerHTML` for draft preview
- CSRF: enforced on admin mutations (see above)
- Rate limiting: enforced in `withAdmin` and public tools/health

## Audit

`audit_logs` records actor, action, resource, before/after for approve/reject and agent config updates. Extend remaining admin mutations the same way.
