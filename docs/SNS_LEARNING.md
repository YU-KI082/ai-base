# SNS Continuous Learning Loop

> Implementation: `packages/sns-learning`, agents `sns-*`, admin `/admin/sns`.

## Principles

1. Extract **structure / patterns / hypotheses** only — never copy third-party captions, video, audio, or design.
2. Prefer **own-post metrics** over third-party trend seeds.
3. **No unauthorized scraping.** Official API providers return empty until credentials exist.
4. **Never invent engagement or revenue numbers.** Missing metrics stay `null`.
5. **Publish requires human approval.** External auto-post is disabled until API connection.
6. While sample sizes are small, confidence stays low — agents must not assert certainty.

## Feedback loop

```
Trend scout → Viral patterns → Experiment plan → Recommendations + scored drafts
        ↑                                                      ↓
   Learning memory ← Performance (24h / 72h / 7d) ← Human publish + real metrics
```

## Agents

| Key | Role |
|-----|------|
| `sns-trend-scout` | Structure observations (API or seed catalog) |
| `sns-viral-analyzer` | Pattern extraction with confidence / expiry |
| `sns-experiment-planner` | Single-factor weekly experiments |
| `sns-performance` | Own-post metrics → learning records (decay) |
| `sns-strategy` | Recommendations + pre-publish scoring / risk hold |
| `social` | Tool-publish drafts with scores |

## Automation levels

| Step | Mode |
|------|------|
| Trend analysis | Auto |
| Draft generation | Auto |
| Scoring / suggestions | Auto |
| Publish | **Human required** |
| External SNS post | After official API |
| Learning apply | Auto |
| Major policy change | Human required |

## Admin

- `/admin/sns` — trends, patterns, experiments, recommendations, rankings, learning CRUD (invalidate/correct)
- `POST /api/v1/admin/sns` — start loop / feedback ticks
- `POST /api/v1/admin/sns/metrics` — ingest real metrics only
