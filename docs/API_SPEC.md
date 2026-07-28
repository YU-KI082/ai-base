# API_SPEC.md

> Implemented under `apps/web/app/api/v1`. Keep paths and behavior aligned.

## Conventions

- Prefix: `/api/v1`
- JSON request/response
- Admin routes: RBAC via `@ai-base/auth` (`ADMIN_DEV_BYPASS=true` for local)
- Mutating admin actions enqueue CloudEvents through the outbox

## Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/tools` | Published tools (`?locale=&category=&q=&take=&skip=`) |
| GET | `/api/v1/tools/:slug` | Tool detail (includes affiliate links) |
| GET | `/api/v1/categories` | Categories |
| GET | `/api/v1/search` | Search published tools (`?q=&locale=`) |
| GET | `/go/:id` | Affiliate redirect + analytics click |
| GET/POST | `/api/v1/auth/session` | Session health |
| GET | `/api/v1/agents/health` | Liveness; `?detailed=1` requires admin |

## Admin

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/api/v1/admin/drafts` | `drafts.read` | List drafts |
| POST | `/api/v1/admin/drafts/:id/approve` | `drafts.approve` | Emit `content.approved.v1` |
| POST | `/api/v1/admin/drafts/:id/reject` | `drafts.approve` | Emit `content.rejected.v1` |
| POST | `/api/v1/admin/ingest` | `agents.manage` | Emit `ingest.manual.requested.v1` |
| GET | `/api/v1/admin/agents` | `agents.read` | Registry |
| POST | `/api/v1/admin/agents/:key/enable` | `agents.manage` | Enable/disable |
| POST | `/api/v1/admin/agents/:key/config` | `agents.manage` | Update JSON config (incl. LLM) |
| GET | `/api/v1/admin/agent-runs` | `agents.read` | Runs |
| GET | `/api/v1/admin/workflows/:id` | `workflows.read` | Pipeline timeline |
| GET | `/api/v1/admin/logs` | `logs.read` | Logs |
| GET | `/api/v1/admin/analytics/summary` | `admin.access` | Ops counters |
| GET | `/api/v1/marketplace` | public | Published agent catalog |
| GET | `/api/v1/admin/marketplace` | `agents.read` | Catalog + installations |
| GET | `/api/v1/admin/marketplace/:key` | `agents.read` | Package detail |
| POST | `/api/v1/admin/marketplace/install` | `agents.manage` | Install from manifest |
| POST | `/api/v1/admin/marketplace/:key/enable` | `agents.manage` | Enable/disable |
| POST | `/api/v1/admin/marketplace/:key/update` | `agents.manage` | Update version |
| GET | `/api/v1/admin/affiliates` | `tools.read` | List affiliate links |
| POST | `/api/v1/admin/affiliates` | `settings.manage` | Create affiliate link |
| PATCH | `/api/v1/admin/affiliates/:id` | `settings.manage` | Update affiliate link |
| DELETE | `/api/v1/admin/affiliates/:id` | `settings.manage` | Delete affiliate link |
| GET | `/api/v1/admin/social` | `tools.read` | List SNS drafts |
| PATCH | `/api/v1/admin/social/:id` | `settings.manage` | Update draft status |

## Approve body

```json
{ "comment": "Looks good" }
```

## Ingest body

```json
{
  "name": "Example AI",
  "homepageUrl": "https://example.com",
  "description": "...",
  "sourceName": "manual",
  "categoryHints": ["productivity"]
}
```

## Agent LLM config via API

```http
POST /api/v1/admin/agents/writer/config
{
  "config": {
    "llmProvider": "gemini",
    "llmModel": "gemini-2.0-flash"
  }
}
```
