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
| `/login` | Production admin sign-in (`ADMIN_OPS_SECRET`) |
| `/admin/drafts` | Human publish gate |
| `/admin/affiliate` | Affiliate Intelligence + `/go` link CRUD |
| `/admin/social` | SNS draft review (manual publish mark) |
| `/admin/ingest` | Start pipeline (requires agents/outbox) |

## Seed

`pnpm db:seed` creates demo published tools (ChatGPT, Notion AI, Midjourney), JA「公式サイト」affiliate links, and one comparison so the public site is reviewable immediately.

## Env

- `NEXT_PUBLIC_SITE_URL` — canonical / sitemap / OG base
- `NEXT_PUBLIC_DEFAULT_LOCALE=ja`
- `ADMIN_OPS_SECRET` — production admin login (16+ chars)

## Explicitly deferred

- Live SNS network posting APIs
- Marketplace billing
- Full AuthN for public accounts / Supabase JWT (ops secret covers MVP)
- OpenSearch / trigram search
- Cache invalidation on publish event
- Hosting agents/outbox on Vercel (run separately when generating new articles)
