# SNS 完全自動運用

## モード

| mode | 動作 |
|------|------|
| `draft_only` | 下書き・採点のみ（デフォルト・安全） |
| `approval` | 品質条件を満たすと「準備完了」まで自動昇格。公開は人 |
| `full_auto` | 品質・提携・OAuth・重複・上限をすべて満たせば自動投稿キュー |

`emergencyStop=true` の間はどのモードでも外部投稿しない。

## 自動公開条件（すべて必須）

- 総合品質スコア ≥ 80
- 著作権・規約・誇大リスクが低い（フラグなし）
- 事実確認済み
- 紹介先URL有効
- アフィリエイト健全リンクあり
- 重複率 ≤ 基準
- 禁止表現なし
- SNS OAuth 接続正常
- 1日上限・投稿間隔を満たす
- 緊急停止OFF・mode=`full_auto`

## 人間へ通知するケースのみ

- SNS連携切れ / 権限失効
- 投稿連続失敗
- 著作権・規約リスク高
- （拡張）売上急減・異常クリック等

通常の成功投稿では通知しない。

## 学習優先順位

利益 → アフィリエイト報酬 → 成約 → CVR → EPC → … → 再生数（最下位）

再生が多くても売上ゼロは高評価しない。

## 初回ランプ

1日1投稿 × 7日 → 問題なければ `afterTestDailyLimit` へ。

## 画面

- `/admin/ops` — 売上中心ダッシュボード + 緊急停止 + モード切替
- 詳細は `/admin/affiliate` `/admin/social` `/admin/sns`

## エージェント

```bash
pnpm --filter @ai-base/agent-sns-auto-ops dev
# あわせて outbox / sns-oauth / social publish / learning 系も常時起動
```

イベント: `sns.auto_ops.tick.v1`

## 完全自動運用を開始するための初回設定（人間のみ）

1. **本番 DB・基盤** — `DATABASE_URL` / `REDIS_URL` を設定し、`pnpm db:push`（または migrate）を実行する  
2. **管理画面ログイン** — `ADMIN_OPS_SECRET`（16文字以上）を設定し、`/login` で入れることを確認する  
3. **サイトURL** — `NEXT_PUBLIC_SITE_URL` を本番ドメインに合わせる（OAuth コールバック・計測リンクの基準）  
4. **トークン暗号化** — `TOKEN_ENCRYPTION_KEY`（32文字以上）を設定する（SNS OAuth トークン保存用）  
5. **Instagram 公式アプリ** — Meta でアプリ作成 → `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` → コールバック URL を登録  
6. **TikTok 公式アプリ** — `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` → コールバック URL を登録  
7. **SNS 連携** — `/admin/social` で Instagram・TikTok を公式 OAuth のみで接続し、状態が「正常」になるまで確認する（ID/パスワードのブラウザ自動操作は使わない）  
8. **アフィリエイト案件** — `/admin/affiliate` で紹介する AI ツールの提携・リンクを登録し、リンクが有効であることを確認する（未提携は投稿されない）  
9. **エージェント常時起動** — 少なくとも `agent-sns-auto-ops`・OAuth 更新・投稿配信・学習／実績取得・outbox ワーカーを本番で動かしておく  
10. **運用ダッシュボード** — `/admin/ops` を開き、初期は `下書きのみ` + **緊急停止 ON** であることを確認する  
11. **テスト開始** — 緊急停止を解除し、モードを `全自動`、**1日1投稿**、ランプ **7日** に設定して保存する（問題なければ自動で上限が段階上昇）  
12. **通知の受け口** — 重大異常（連携切れ・連続失敗・アカウント警告など）だけ見られるよう、管理画面の異常一覧を日常確認先にする（通常投稿の成功通知は送られない）

上記以外の日常投稿確認は不要。以降は売上・成約・利益・重大異常だけを `/admin/ops` で見る。
