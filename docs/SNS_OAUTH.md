# SNS OAuth（Instagram / TikTok）+ TikTok集客

## 方針

- **ID・パスワードは保存しない**（ブラウザ自動ログイン禁止）
- 初回のみ管理者が公式OAuth画面で許可
- アクセストークン / リフレッシュトークンを `TOKEN_ENCRYPTION_KEY` で暗号化して DB 保存
- 期限前にバックグラウンド自動更新（`sns-oauth` エージェント / 管理画面の一括更新）
- 更新失敗・権限解除・APIエラー時のみ「再認証必要」を表示し管理者へ通知（ログ）
- SNS投稿は **管理者承認後**、投稿前に接続状態を自動確認してから実行
- **TikTokを主要集客チャネル**として扱い、AI BASE流入・アフィリエイトCVを最優先

## 対応SNS

| プラットフォーム | OAuth | 備考 |
|---|---|---|
| TikTok | ✅ | 台本15/30/60・素材プラン・Content Posting API |
| Instagram | ✅ | Reels向け下書き |
| X / Threads / note | 下書きのみ | 将来OAuth拡張 |
| LinkedIn | 下書きスタブ | 将来対応 |

## OAuth接続ステータス

| status | 日本語 |
|--------|--------|
| `connected` | 連携済み |
| `auto_refreshing` | 自動更新中 |
| `reauth_required` | 再認証必要 |
| `disconnected` | 未連携 |

## 投稿キューステータス

| status | 日本語 |
|--------|--------|
| `draft` | 下書き |
| `pending_approval` | 承認待ち |
| `ready` | 投稿準備完了 |
| `scheduled` | 予約投稿 / API・素材待ち |
| `published` | 投稿済み |
| `failed` | 失敗 |
| `retry` | 再試行 |
| `rejected` | 却下 |

API審査前・メディア未用意時は、台本・説明文・ハッシュタグを生成したまま `scheduled`（投稿待ち）にします。

## TikTok生成内容

- コンテンツ種別: 紹介 / 比較 / ランキング / ニュース / 使い方 / 失敗例 / ビフォーアフター / 初心者向け
- 台本: **15秒 / 30秒 / 60秒**（フック0–2秒、ナレーション、テロップ、映像指示、CTA、ハッシュタグ、AI BASE誘導）
- 素材パッケージ: 縦型9:16（1080x1920）、SRT字幕、ストーリーボード、UI紹介指示、ロゴ、背景モーション、BGM候補、サムネ候補、書き出しチェックリスト
- API未承認 / 動画URL未設定時は説明文・ハッシュタグ・台本を保持したまま `scheduled`（投稿待ち）。**パスワード自動ログインは禁止**

管理画面: `/admin/social` → 「TikTok投稿を生成」 / 台本展開 / 動画URL添付 / 分析同期  
API:
- `POST /api/v1/admin/social/tiktok/generate`
- `POST /api/v1/admin/social/{id}/media?action=attach_media`
- `POST /api/v1/admin/social/{id}/media?action=sync_metrics`

## 環境変数

| 変数 | 用途 |
|------|------|
| `TOKEN_ENCRYPTION_KEY` | トークン暗号化（32文字以上） |
| `OAUTH_STATE_SECRET` | OAuth state署名 |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Meta アプリ |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok アプリ |
| `TIKTOK_OAUTH_SCOPES` | 既定 `user.info.basic,video.upload,video.publish` |
| `TIKTOK_PRIVACY_LEVEL` | 投稿公開範囲（既定 `PUBLIC_TO_EVERYONE`） |
| `NEXT_PUBLIC_SITE_URL` | OAuth コールバックURLのベース |

コールバック: `{SITE}/api/v1/admin/social/oauth/{instagram|tiktok}/callback`

## 分析指標（SnsPostMetrics）

再生 / 平均視聴時間 / 視聴維持率 / 3秒視聴率 / 完視聴率 / いいね・コメント・シェア・保存（率＋件数） / プロフィール遷移 / AI BASEクリック（affiliateClicks） / 投稿別CV

- 公式 `video.query` で取得できる項目は自動同期（スコープ不足時は null のまま — 捏造しない）
- サイト側 `/go` クリックとアフィリエイトCVは既存トラッキングと突合
- 伸びた投稿のフック・尺・テーマ・台本構成・字幕量・CTA・投稿時間を学習し、次回TikTok生成へ自動反映（再生数よりCV優先）

## エージェント

```bash
pnpm --filter @ai-base/agent-sns-oauth dev
pnpm --filter @ai-base/agent-social dev
pnpm --filter @ai-base/agent-sns-performance dev
```

## パッケージ

- `@ai-base/sns-oauth` — OAuth / TikTok publish
- `@ai-base/sns-learning` — 学習 + `tiktok.ts` 台本・素材生成
- DB: `social_posts`, `sns_oauth_connections`, `sns_post_metrics`
