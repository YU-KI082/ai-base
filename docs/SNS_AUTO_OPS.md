# SNS 完全自動運用（企画→動画→投稿→分析→改善）

管理者は **初回 OAuth・API 設定のみ**。以降は承認なしで AI BASE が自動実行する。

## 対応 SNS

| SNS | 投稿 | 備考 |
|-----|------|------|
| TikTok | Content Posting API (`PULL_FROM_URL`) | 公開可能な MP4 URL 必須 |
| Instagram | Content Publishing API (Reels) | `INSTAGRAM_BUSINESS_ACCOUNT_ID` + 動画 URL |
| X | API v2 tweets | OAuth 2.0 |
| Threads | Threads API | Meta OAuth |
| note | Provider | 公式 API 未設定時は **投稿待ちキュー**（下書き保存）。`NOTE_API_*` で差し替え可 |

**禁止:** ID/パスワードのブラウザ自動ログイン。公式 OAuth のみ。

## フルオート パイプライン

1. **テーマ自動選定** — 新着ツール / ニュース / 比較 / ランキング / 使い方 / 事例 / トレンド / 過去実績
2. **コンテンツ生成** — 投稿文・タイトル・フック・ナレーション・字幕・ハッシュタグ・CTA・サムネ文言（SNS別）
3. **動画制作** (`@ai-base/video-render`) — 9:16 / 15·30·60秒。Provider 差し替え可:
   - `ffmpeg`（デフォルト）
   - `remotion`（`REMOTION_ENABLED=1`）
   - `external_api`（`VIDEO_API_URL`）
4. **ポリシーチェック** — 誇大・虚偽・著作権リスク・禁止表現
5. **自動投稿** — OAuth トークン暗号化保存・自動 refresh
6. **分析** — 再生・視聴維持・いいね等 + クリック/CV/売上（学習優先は利益）
7. **改善** — `learningSignals` を次回テーマ・フック・尺・時間・CTA へ反映
8. **自動停止** — 認証失敗・権限失効・連続失敗・ポリシー・コスト異常・重複大量

## モード

| mode | 動作 |
|------|------|
| `draft_only` | 生成のみ |
| `approval` | 準備完了まで。公開は人 |
| `full_auto` | **承認不要**で投稿キュー（推奨本番） |

`emergencyStop=true` の間は外部投稿しない。

## Cron

`GET /api/v1/cron/sns-auto-ops`（`vercel.json` で毎日 09:00 UTC。Hobby では1日1回まで）  
Header: `Authorization: Bearer $CRON_SECRET`

手動: `pnpm --filter @ai-base/agent-sns-auto-ops` または管理画面「フルオート 1 サイクル」

## E2E（ローカル）

```bash
# ffmpeg 必須（PATH または FFMPEG_PATH）
pnpm exec tsx scripts/sns-full-auto-e2e.ts
```

公開テスト投稿は各 SNS の OAuth が `/admin/social` で「正常」かつ `SNS_AUTO_OPS_MODE=full_auto` のとき実行。

## 管理画面

- `/admin/social` — 接続状態・本日予定・生成中・投稿済・失敗・再生/CV/売上・緊急停止
- `/admin/ops` — 売上・利益・重大エラー中心

通常投稿の成功通知は送らない。3 回失敗または重大エラーのみ管理者へ。

## 初回セットアップ（人間のみ）

1. `DATABASE_URL` / `TOKEN_ENCRYPTION_KEY` / `NEXT_PUBLIC_SITE_URL` / `ADMIN_OPS_SECRET`
2. TikTok / Instagram / X / Threads の公式アプリとコールバック登録
3. `/admin/social` で各 SNS を OAuth 接続
4. （任意）`VIDEO_PUBLIC_BASE_URL` を本番オリジンに（TikTok/IG が動画を取得できる URL）
5. `/admin/ops` で緊急停止 OFF・`full_auto`・日次上限を設定
6. `CRON_SECRET` を Vercel に設定

以降の日常確認は売上・利益・重大エラーのみ。
