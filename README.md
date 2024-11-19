# AI観光ガイドチャットボット

## 概要

このプロジェクトは、Dify.AIを活用した旅行者向けのAIチャットボットアプリケーションです。以下の機能を提供します：

- 旅行先のおすすめ情報の提供
- 文化や地域に関する詳細な情報
- カスタマイズされた旅程の提案
- 実用的な旅行アドバイス
- 旅行計画のサポート

## 技術スタック

### フロントエンド
- React + TypeScript
- Tailwind CSS
- shadcn/ui コンポーネント
- SWR (データフェッチング)
- WebSocket (リアルタイム通信)

### バックエンド
- Node.js + Express
- WebSocket
- Dify.AI API

### 開発ツール
- Vite
- ESBuild
- TypeScript

## インストール方法

1. リポジトリのクローン：
\`\`\`bash
git clone [repository-url]
cd ai-tourism-guide
\`\`\`

2. 依存関係のインストール：
\`\`\`bash
npm install
\`\`\`

3. 環境変数の設定：
\`\`\`bash
DIFY_API_KEY=your_dify_api_key
\`\`\`

4. 開発サーバーの起動：
\`\`\`bash
npm run dev
\`\`\`

## 主要機能

### チャットインターフェース
- リアルタイムレスポンス
- メッセージ履歴の保持
- タイピングインジケーター
- エラーハンドリング

### AI機能
- インテリジェントな旅行提案
- パーソナライズされたレコメンデーション
- 文脈を理解した会話
- マルチターンの対話サポート

## プロジェクト構造

\`\`\`
.
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   └── index.html
├── server/
│   ├── services/
│   │   └── dify.ts
│   └── index.ts
└── package.json
\`\`\`

## デプロイ

プロダクションビルドの作成：
\`\`\`bash
npm run build
\`\`\`

サーバーの起動：
\`\`\`bash
npm start
\`\`\`

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| DIFY_API_KEY | Dify.AI APIキー | はい |
| PORT | サーバーポート | いいえ (デフォルト: 5000) |

## 注意事項

- Dify.AI APIキーは必須です
- 本番環境では適切なセキュリティ対策を実装してください
- APIの利用制限に注意してください

## ライセンス

MIT

## 貢献方法

1. Forkを作成
2. 機能ブランチを作成 (\`git checkout -b feature/amazing-feature\`)
3. 変更をコミット (\`git commit -m 'Add some amazing feature'\`)
4. ブランチをプッシュ (\`git push origin feature/amazing-feature\`)
5. プルリクエストを作成

## サポート

問題や質問がある場合は、Issueを作成してください。

---

詳細な実装については、各コンポーネントのソースコードを参照してください。
