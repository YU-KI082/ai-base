# Affiliate Intelligence

> Package: `packages/affiliate-intel` · Agent: `agents/affiliate` · Admin: `/admin/affiliate`

## Behavior

1. When a tool is published (`content.published.v1`), the affiliate agent registers an **アフィリエイト未確認** case (`status=uninvestigated`, `hasAffiliate=null`).
2. AI proposes investigation targets for each ASP:
   - 公式 / A8 / もしも / アクセストレード / バリューコマース
3. Humans update lead statuses in admin (color-coded).
4. Performance uses **real** `/go` clicks + recorded conversions only — never fabricated.

## Status colors

| Status | JA |
|--------|-----|
| uninvestigated | 未調査 |
| investigating | 調査中 |
| available | 提携可能 |
| applying | 申請中 |
| partnered | 提携済 |
| unavailable | 提携不可 |

## Metrics

- クリック数 — `analytics` `affiliate.click`
- CV数 / 売上 / 報酬額 — `affiliate_conversions`
- CVR = CV / clicks (null if clicks=0)
- EPC = revenue / clicks (null if clicks=0)

## Admin actions

- 既存ツールを今すぐ同期
- ASP lead status / reward / cookie / terms
- CV・売上の手動記録（実数値のみ）
- `/go` トラッキングリンク CRUD
