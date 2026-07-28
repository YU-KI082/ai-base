# EVENT_SYSTEM.md

> Implementation: `packages/events`. Catalog must stay additive (`*.v1`, then `*.v2`).

## Envelope (CloudEvents-compatible)

```ts
type AiBaseEvent<T> = {
  id: string
  type: string
  source: string
  specversion: "1.0"
  time: string
  datacontenttype: "application/json"
  dataschema: string
  subject?: string
  correlationid: string
  causationid?: string
  locale?: "en" | "ja"
  data: T
}
```

## Transport

| Component | Role |
|-----------|------|
| `EventBus` | Port: `publish` / `subscribe` |
| `RedisStreamsEventBus` | Production |
| `InMemoryEventBus` | Tests |
| `events_outbox` + relay | Durable publish from API/agents |
| `event_consumptions` | Idempotency per consumer group |

## Catalog

| Type | Producer | Consumers |
|------|----------|-----------|
| `ingest.manual.requested.v1` | admin ingest | scout |
| `tool.candidate.created.v1` | scout | reviewer |
| `tool.reviewed.v1` | reviewer | writer, planner |
| `content.draft.generated.v1` | writer | designer, translator |
| `content.assets.ready.v1` | designer | seo |
| `content.translated.v1` | translator | seo |
| `content.seo.ready.v1` | seo | observers |
| `content.pending_approval.v1` | seo | admin |
| `content.approved.v1` | approval API | publisher |
| `content.rejected.v1` | approval API | writer |
| `content.published.v1` | publisher | social, analytics, planner |

## Rules

1. No peer RPC — publish events only.
2. Never mutate historical events.
3. Revise loops emit new events + new `agent_runs`.
4. SEO uses a barrier (assets + translation) with claim key `seo-finalize`.
5. Admin approve/reject MUST use `withOutboxEvent` so domain writes + outbox row are atomic.
6. Agent workers claim (`event_consumptions`) after disabled-check; **release claim on handler failure** so Redis pending messages can retry.

## Outbox relay

```bash
pnpm --filter @ai-base/events outbox:dev
```

- Polls unpublished rows with `attempts < OUTBOX_MAX_ATTEMPTS` (default 25)
- Exhausted rows remain unpublished (`listDeadLetters`) for operator inspection
- Payload validated on consume via `parseEvent` (CloudEvents Zod schema)