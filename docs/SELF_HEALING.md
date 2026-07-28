# Self-Healing Agent

実行時・ビルド・API・テスト失敗を検知し、**安全な範囲だけ**自動修復する。

## フロー

エラー検知 → ログ / インシデント保存 → 原因分析 → 影響範囲 → 修正案 →
一時適用 → 型チェック / Lint / テスト / ビルド → 成功時のみ確定 → 監査ログ

## 自動修復してよいもの

- 翻訳キー不足 / i18n フォールバック
- null / undefined の安全なフォールバック
- 明確な型不整合・import 漏れ（限定）
- API レスポンス形式の軽微な不一致（提案）
- 一時的ネットワーク失敗の再試行
- キャッシュ不整合・再起動で直るサービス（提案 / 再試行）

## 承認が必要なもの（自動適用禁止）

- DB スキーマの破壊的変更・データ削除
- 認証 / 権限の大幅変更
- 決済・アフィリエイト成果計測
- 秘密情報 / 環境変数の変更
- SNS アカウント設定
- 大量ファイル一括書き換え
- 原因が特定できない変更

## 安全装置

- 修正前に差分バックアップ、失敗時ロールバック
- 同一 fingerprint 最大 3 回
- 修正範囲最小化（既定 max 5 ファイル）
- **本番への直接パッチ適用は常に禁止**
- 緊急停止（`emergencyStop`）
- 全履歴を `self_healing_incidents` / `self_healing_attempts` に保存

## 画面

`/admin/self-healing`

## エージェント

```bash
pnpm --filter @ai-base/agent-self-healing dev
```

イベント: `self_healing.tick.v1` / `self_healing.error.reported.v1`

## ロールバック

1. 管理画面でインシデントの `rollbackResult` を確認
2. 失敗時は自動で `diffBefore` からファイル復元される
3. 手動: `git checkout -- <changedFiles>`（Git 管理下）
