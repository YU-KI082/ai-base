# PUBLIC_MVP.md

Public launch MVP scope — ship feedback loop, not more domains.

## Public surfaces (shipped)

| Route | Purpose |
|-------|---------|
| `/` | Brand hero + CTAs |
| `/tools` | Published tools list + category chips |
| `/tools/[slug]` | Detail, FAQ, JSON-LD, affiliate CTA, compare links |
| `/search` | Keyword search UI |
| `/categories`, `/categories/[key]` | Category browsing |
| `/compare`, `/compare/[slug]` | Ad-hoc side-by-side + curated comparisons |
| `/go/[id]` | Affiliate redirect + `affiliate.click` analytics |
| `/sitemap.xml`, `/robots.txt` | Crawl basics |

## Admin ops for launch

| Route | Purpose |
|-------|---------|
| `/admin/drafts` | Human publish gate |
| `/admin/affiliate` | Affiliate link CRUD |
| `/admin/social` | SNS draft review (manual publish mark) |
| `/admin/ingest` | Start pipeline |

## Seed

`pnpm db:seed` creates demo published tools (ChatGPT, Notion AI, Midjourney), affiliate links, and one comparison so the public site is reviewable immediately.

## Env

- `NEXT_PUBLIC_SITE_URL` — canonical / sitemap / OG base

## Explicitly deferred

- Live SNS network posting APIs
- Marketplace billing
- Full AuthN for public accounts
- OpenSearch / trigram search
- Cache invalidation on publish event
