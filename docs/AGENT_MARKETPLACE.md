# AGENT_MARKETPLACE.md

> Implementation: `packages/marketplace`, schema tables `marketplace_*`, admin UI `/admin/marketplace`, APIs under `/api/v1/.../marketplace`.

## Purpose

AI BASE manages **AI tools and AI agents**. The Agent Marketplace catalogs, installs, enables, updates, and (later) sells/shares agent plugins — without rewriting existing workers.

## Concepts

| Concept | Role |
|---------|------|
| **Marketplace package** | Catalog entry (`free` / `paid` / `internal` / `community`) |
| **Package version** | Versioned `MarketplaceAgentManifest` snapshot |
| **Installation** | Links a package version to a runtime `Agent` row |
| **Runtime Agent** | Existing worker registry (`agents` table) — unchanged contract |

## Manifest

```ts
{
  key: "writer",
  version: "0.1.0",
  name: { en: "Writer", ja: "ライター" },
  description: { en: "...", ja: "..." },
  subscribe: ["tool.reviewed.v1"],
  publish: ["content.draft.generated.v1"],
  capabilities: ["generate_tool_page"],
  permissions: ["knowledge.read", "drafts.write", "llm.complete"],
  requiredProviders: { llm: ["openai", "anthropic", "mock"] },
  dependencies: [{ key: "reviewer", versionRange: "^0.1.0" }],
  marketplace: {
    visibility: "internal", // free | paid | internal | community
    listingStatus: "published",
    tags: ["builtin", "content"],
    priceUsd: null
  }
}
```

Existing agents only need the original fields; marketplace fields are optional and default to `internal` + `published` on boot registration.

## Capabilities

- Register plugin → catalog + version + runtime agent + installation
- Enable / disable (runtime status + installation status)
- Dependency check (semver ranges: `*`, `^`, `~`, `>=`, exact)
- Permission declaration per package
- Update to latest (or specific) version
- External install via `POST /api/v1/admin/marketplace/install` (manifest JSON)

## APIs

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/marketplace` | Public catalog (free/community/paid published) |
| GET | `/api/v1/admin/marketplace` | Admin catalog + installations |
| GET | `/api/v1/admin/marketplace/:key` | Package detail |
| POST | `/api/v1/admin/marketplace/install` | Register/install from manifest |
| POST | `/api/v1/admin/marketplace/:key/enable` | Enable/disable |
| POST | `/api/v1/admin/marketplace/:key/update` | Update version |

## External developers (future-ready)

1. Author an `AgentPlugin` with a full `MarketplaceAgentManifest`
2. Publish via install API (or CI → catalog)
3. Operators enable after dependency/permission review
4. Paid listings use `visibility: "paid"` + `priceUsd` (billing later)

## Non-breaking guarantee

- Runtime still uses `@ai-base/agents-sdk` `AgentPlugin`
- Workers still boot with `bootstrapAgentMain`
- `registerAgent` now also upserts marketplace metadata idempotently
