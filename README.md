# AI BASE

AI-operated media company that discovers, evaluates, explains, and recommends AI tools.
Humans approve every publish. Agents are **LLM-vendor agnostic** (OpenAI / Claude / Gemini / Grok / local / mock).

## Docs

See [docs/README.md](docs/README.md) for the full design set (`SYSTEM_ARCHITECTURE`, `DATABASE_SCHEMA`, `API_SPEC`, `AGENT_ARCHITECTURE`, `EVENT_SYSTEM`, …).

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm --filter @ai-base/events outbox:dev
pnpm agents:dev
pnpm --filter @ai-base/web dev
```

Open http://localhost:3000 and http://localhost:3000/admin

## Switch LLM provider

```bash
# .env
LLM_PROVIDER=anthropic   # or openai | gemini | grok | local | mock
LLM_MODEL=claude-3-5-haiku-latest
ANTHROPIC_API_KEY=...
```

Per-agent override via Admin → Agents → config:

```json
{ "llmProvider": "grok", "llmModel": "grok-2-latest" }
```

## Principles

- Agents are independent plugin workers
- Communication is event-driven only (CloudEvents + outbox + Redis Streams)
- Publisher never runs without `content.approved.v1`
- Locales `en` and `ja` are first-class from day one
- Implementation and `/docs` stay synchronized
