# AI BASE — 完全自動AI会社

人間は **初回の API / OAuth / ASP アカウント作成のみ**。以降は AI 社員が 24/7 でループします。

```
情報収集 → 評価・記事化 → SEO → 動画 → SNS投稿 → 分析 → 改善 → 収益最大化
```

## AI 社員（Agents）

| Agent | 役割 |
|-------|------|
| `company-ops` | 日次コンダクター。各エージェントへ fan-out。ツール公開の自動承認 |
| `research` | Product Hunt / HF / GitHub / ベンダー / Reddit から新AIツール収集 |
| `scout`〜`publisher` | 既存ツール評価・翻訳・SEO・公開パイプライン |
| `seo-content` | 比較/ランキング/使い方/FAQ/初心者向け記事＋内部リンク/JSON-LD/OGP |
| `affiliate` | ASP案件調査＋最適オファー自動採用 |
| `sns-auto-ops` / `sns-oauth` | TikTok/IG/X/Threads 自動投稿 + note/LinkedIn/YT/Pinterest/FB キュー |
| `video` | FFmpeg / Remotion / ElevenLabs Provider でショート動画 |
| `analytics` | 日次 KPI・改善案 |
| `auto-improve` | 低CTR/薄い記事のタイトル・本文・CTA 自動改善 |
| `trend-predict` | 伸びそうなAIを予測し優先記事化 |
| `self-healing` | API/投稿/認証エラーの自動復旧 |

## 管理画面

- `/admin/company` — 収益ダッシュボード（今日/昨日/今月/総収益・ASP別・SNS別・ROI）+ 緊急停止 + マルチサイト切替
- `/admin/social` `/admin/ops` — SNS・緊急運用

## Cron

`GET /api/v1/cron/company-ops`（毎日 09:00 UTC）  
→ Research / Trend / SEO記事 / Affiliate / SNS / Video / Analytics / Improve / Self-healing

## マルチサイト

`SITE_BRAND_PACKS`: AI BASE / BEAUTY / TRAVEL / MONEY / PET / HEALTH  
管理画面からワンクリックで `activeSiteBrandKey` を切替（コード分岐なし）。

## 初回セットアップ（人間のみ）

1. `DATABASE_URL` / `TOKEN_ENCRYPTION_KEY` / `ADMIN_OPS_SECRET` / `CRON_SECRET`
2. SNS OAuth（TikTok / IG / X / Threads）
3. （任意）`PRODUCTHUNT_TOKEN` / `GITHUB_TOKEN` / `ELEVENLABS_API_KEY` / `VIDEO_API_*`
4. `/admin/company` で緊急停止OFF・フルオート確認
5. 「会社1日サイクル実行」

以後の日常確認は **売上・利益・重大エラーのみ**。
