# SNS OAuth（Instagram / TikTok）

## 方針

- **ID・パスワードは保存しない**
- 初回のみ管理者が公式OAuth画面で許可
- アクセストークン / リフレッシュトークンを `TOKEN_ENCRYPTION_KEY` で暗号化して DB 保存
- 期限前にバックグラウンド自動更新（`sns-oauth` エージェント / 管理画面の一括更新）
- 更新失敗・権限解除・APIエラー時のみ「再認証必要」を表示し管理者へ通知（ログ）
- SNS投稿は **管理者承認後**、投稿前に接続状態を自動確認してから実行

## ステータス表示

| status | 日本語 |
|--------|--------|
| `connected` | 連携済み |
| `auto_refreshing` | 自動更新中 |
| `reauth_required` | 再認証必要 |
| `disconnected` | 未連携 |

## 環境変数

| 変数 | 用途 |
|------|------|
| `TOKEN_ENCRYPTION_KEY` | トークン暗号化（32文字以上） |
| `OAUTH_STATE_SECRET` | OAuth state署名（未設定時は暗号化キー等を流用） |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Meta アプリ |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok アプリ |
| `NEXT_PUBLIC_SITE_URL` | OAuth コールバックURLのベース |

コールバック:  
`{SITE}/api/v1/admin/social/oauth/{instagram|tiktok}/callback`

Meta / TikTok の開発者コンソールに同じ Redirect URI を登録してください。

## 管理画面

`/admin/social`

1. 「公式OAuthで連携」→ 公式ログイン・権限許可
2. 以降は自動更新（「期限前トークンを一括更新」または `sns.oauth.refresh.tick.v1`）
3. 下書きを「準備完了」→「公開済み」で投稿キュー（接続チェック必須）

## エージェント

```bash
pnpm --filter @ai-base/agent-sns-oauth dev
```

購読: `sns.oauth.refresh.tick.v1`, `sns.post.publish.requested.v1`

## パッケージ

- `@ai-base/sns-oauth` — プロバイダ / 暗号化連携サービス
- `packages/auth` — `sealSecret` / `openSecret`
- DB: `sns_oauth_connections`
