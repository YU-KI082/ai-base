# SEO.md

## Goals

- SSR/ISR-ready public tool pages (Next.js App Router)
- Bilingual (`en` / `ja`) SEO fields as first-class columns
- Agent-generated title, meta, FAQ, schema, internal links before human approval

## Pipeline role: SEO Agent

Subscribes to:

- `content.assets.ready.v1`
- `content.translated.v1`

Barrier: both `assetsReady` and `translationReady` on draft payload.

Then writes into draft payload:

- `seo.en|ja.title`
- `seo.en|ja.description`
- `seo.en|ja.faq[]`
- `seo.en|ja.schema` (SoftwareApplication JSON-LD seed)
- `seo.internalLinks[]`

Emits:

- `content.seo.ready.v1`
- `content.pending_approval.v1`

Sets draft status → `pending_approval`.

## Persistence on publish

Publisher copies SEO fields into `ai_tool_translations`:

- `seo_title`, `seo_description`, `faq`, `schema_json`

## Site-level SEO (public app)

| Feature | Status |
|---------|--------|
| Semantic HTML tool pages | Implemented |
| `generateMetadata` (title/description/canonical/OG) | Implemented |
| JSON-LD from `schema_json` | Implemented on tool detail |
| Locale query `?locale=` | Implemented |
| `app/sitemap.ts` / `app/robots.ts` | Implemented |
| Affiliate `rel=nofollow sponsored` | Implemented |
| Breadcrumb / RSS | Later |
| Core Web Vitals | Next.js defaults; measure in prod |

## Content guidelines

- Titles unique per locale
- Meta description ≤ ~155 chars (agent truncates)
- FAQ pairs grounded in tool description
- No index of `building` / `pending_approval` drafts
