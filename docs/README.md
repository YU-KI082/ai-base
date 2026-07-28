# AI BASE Documentation Index

**Engineering covenant** (also in `.cursor/rules/ai-base-principles.mdc`): no throwaway code; maintainability & extensibility first; event-driven plugins; LLM via Provider pattern; tests + docs required with every change; adding an agent must not rewrite existing agents.

Canonical design docs (keep synchronized with code):

| Doc | Topic |
|-----|--------|
| [AGENT_MARKETPLACE.md](./AGENT_MARKETPLACE.md) | Agent Registry & Marketplace |
| [KNOWLEDGE_LAYER.md](./KNOWLEDGE_LAYER.md) | Knowledge Graph + Memory + RAG |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Platform architecture |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Prisma / tables |
| [API_SPEC.md](./API_SPEC.md) | `/api/v1` |
| [AGENT_ARCHITECTURE.md](./AGENT_ARCHITECTURE.md) | Plugins + LLM independence |
| [EVENT_SYSTEM.md](./EVENT_SYSTEM.md) | CloudEvents catalog |
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Monorepo layout |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Local & production |
| [SECURITY.md](./SECURITY.md) | RBAC, CSRF, rate limit, secrets, audit |
| [SEO.md](./SEO.md) | SEO agent + public SEO |
| [SCALE.md](./SCALE.md) | 10M PV / 1M users readiness |
| [PUBLIC_MVP.md](./PUBLIC_MVP.md) | Public launch surface checklist |
| [SNS_LEARNING.md](./SNS_LEARNING.md) | Instagram/TikTok continuous learning loop |
| [AFFILIATE_INTELLIGENCE.md](./AFFILIATE_INTELLIGENCE.md) | Affiliate case workflow + ASP proposals |
| [ROADMAP.md](./ROADMAP.md) | Near / mid / long term |

Legacy notes (superseded by the above; retained for history):

- [MASTER_SPEC.md](./MASTER_SPEC.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md) → see SYSTEM_ARCHITECTURE.md
- [EVENTS.md](./EVENTS.md) → see EVENT_SYSTEM.md
- [AGENTS.md](./AGENTS.md) → see AGENT_ARCHITECTURE.md
