# @shuji-bonji/web-compat-mcp

[![CI](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shuji-bonji/web-compat-mcp)](https://www.npmjs.com/package/@shuji-bonji/web-compat-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Web Platform 全体のブラウザ互換性データを提供する MCP サーバー**

_「この機能、本当にブラウザで動くの？」_ という質問に答えます。

[MDN Browser Compat Data (BCD)](https://github.com/mdn/browser-compat-data)（15,000以上の機能）と [W3C WebDX web-features](https://github.com/web-platform-dx/web-features)（Baseline ステータス付き 1,000以上の機能）を使用して、実際のブラウザ実装状況を提供します。

> **完全オフライン動作** — すべてのデータは npm パッケージとしてバンドル済み。API呼び出しなし、ゼロレイテンシ。

🇬🇧 [English README](./README.md)

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│           web-compat-mcp server             │
│                                             │
│  ┌───────────────┐  ┌───────────────────┐   │
│  │ @mdn/browser- │  │   web-features    │   │
│  │  compat-data  │  │  (W3C WebDX CG)   │   │
│  │  15K+ features│  │  1K+ features     │   │
│  │  BCD JSON     │  │  Baseline status  │   │
│  └───────┬───────┘  └────────┬──────────┘   │
│          │   相互参照         │              │
│          └────────┬──────────┘              │
│                   │                         │
│          ┌────────▼────────┐                │
│          │   7 MCP Tools   │                │
│          └────────┬────────┘                │
│                   │ stdio                   │
└───────────────────┼─────────────────────────┘
                    │
            MCP クライアント (Claude など)
```

## ツール一覧

| ツール | 説明 |
|--------|------|
| `compat_check` | 特定機能のブラウザ互換性チェック（BCD ドット表記） |
| `compat_search` | 15,000以上の BCD 機能をキーワード検索 |
| `compat_get_baseline` | Web 機能の Baseline ステータス取得（web-features ケバブケース） |
| `compat_list_baseline` | Baseline ステータスでフィルタリングした機能一覧 |
| `compat_compare` | 2〜5 機能のブラウザ互換性を横並び比較 |
| `compat_list_browsers` | 追跡中の全ブラウザとバージョン一覧 |
| `compat_check_support` | 特定ブラウザバージョンで追加された機能の検索 |

## クイックスタート

### npx（インストール不要）

```bash
npx @shuji-bonji/web-compat-mcp
```

### npm（グローバルインストール）

```bash
npm install -g @shuji-bonji/web-compat-mcp
web-compat-mcp
```

## MCP クライアント設定

### Claude Desktop

`claude_desktop_config.json` に追加：

```json
{
  "mcpServers": {
    "web-compat": {
      "command": "npx",
      "args": ["-y", "@shuji-bonji/web-compat-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add web-compat -- npx -y @shuji-bonji/web-compat-mcp
```

### VS Code (Copilot / Continue)

`.vscode/mcp.json` に追加：

```json
{
  "servers": {
    "web-compat": {
      "command": "npx",
      "args": ["-y", "@shuji-bonji/web-compat-mcp"]
    }
  }
}
```

## 使用例

### ブラウザ互換性チェック

> 「Push API は Safari で使える？」

```
→ compat_check feature: "api.PushManager"
```

ブラウザ別のバージョンサポート、Baseline ステータス、MDN/仕様へのリンクを返します。

### 機能検索

> 「CSS grid 関連の機能を探して」

```
→ compat_search query: "grid" category: "css"
```

マッチする機能IDと、standard/experimental/deprecated フラグを返します。

### 機能比較

> 「fetch と XMLHttpRequest を比較して」

```
→ compat_compare features: ["api.fetch", "api.XMLHttpRequest"]
```

バージョンサポートと Baseline ステータスの横並び比較テーブルを返します。

### Baseline ステータス確認

> 「container queries は Baseline？」

```
→ compat_get_baseline feature: "container-queries"
```

Baseline レベル（Widely Available / Newly Available / Not Baseline）、ブラウザサポート、関連 BCD 機能を返します。

### ブラウザバージョン別の追加機能

> 「Chrome 120 で追加された CSS 機能は？」

```
→ compat_check_support browser: "chrome" version: "120" category: "css"
```

指定バージョンで追加された機能一覧を返します。

## 出力形式

すべてのツールで `response_format` パラメータをサポート：

- `"markdown"`（デフォルト）— 人間が読みやすいテーブル形式
- `"json"` — プログラム利用向けの構造化データ（`structuredContent` 付き）

## 補完的な MCP サーバー

このサーバーは他の MCP サーバーと組み合わせて使うことを想定しています：

| サーバー | 役割 | このサーバーの補完関係 |
|----------|------|------------------------|
| **W3C MCP** | 仕様定義（MUST/SHOULD/MAY） | 実際のブラウザ実装状況 |
| **RFCXML MCP** | RFC 要件 | ブラウザレベルのプロトコルサポート |
| **css-mcp** | CSS ドキュメント＋コード分析 | プラットフォーム全体の互換性＋Baseline |

## データソース

| ソース | パッケージ | 機能数 | 更新頻度 |
|--------|-----------|--------|----------|
| [MDN BCD](https://github.com/mdn/browser-compat-data) | `@mdn/browser-compat-data` | 15,000+ | 週次 |
| [web-features](https://github.com/web-platform-dx/web-features) | `web-features` | 1,000+ | 月次 |

## 開発

```bash
# 依存パッケージのインストール
npm install

# ビルド
npm run build

# テスト実行
npm test              # ユニットテスト（66テスト）
npm run test:e2e      # E2Eテスト（JSON-RPC経由、10テスト）

# リント＆フォーマット（Biome 2.x）
npm run lint          # チェック
npm run lint:fix      # 自動修正
npm run format        # フォーマット

# 型チェック
npm run typecheck
```

## ライセンス

MIT — [LICENSE](./LICENSE) を参照
