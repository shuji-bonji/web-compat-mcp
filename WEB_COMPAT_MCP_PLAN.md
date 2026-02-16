# WEB COMPAT MCP Server 構築計画

> `@shuji-bonji/web-compat-mcp`
> リポジトリ: https://github.com/shuji-bonji/web-compat-mcp

---

## 1. プロジェクト概要

### 1.1 目的

W3C MCPが「仕様上のあるべき姿（MUST/SHOULD）」を提供するのに対し、
**Web Compat MCP**は「現実のブラウザ実装状況」を提供する。

```
開発者の問い：「この機能は使えるか？」

  ① W3C MCP       → 仕様上のセマンティクス（MUST/SHOULD）
  ② Web Compat MCP → ブラウザ対応状況（Chrome 98+, Safari 17.4+）
  ③ Web Compat MCP → Baselineステータス（Widely / Newly Available）

  → 合わせて「仕様準拠 + 実装状況 + 実用判断」が完結する
```

### 1.2 データソース

| データソース | 管理団体 | 内容 | 配布形態 |
|---|---|---|---|
| `@mdn/browser-compat-data` (BCD) | Mozilla | 15,000+フィーチャーのブラウザ互換性 | npm (JSON) |
| `web-features` | W3C WebDX CG | 1,000+フィーチャーのBaselineステータス | npm (JSON) |

### 1.3 5軸評価

| 軸 | 評価 |
|---|---|
| 管理団体 | ✅ Mozilla + W3C WebDX CG |
| オープン性 | ✅ 完全無料・GitHub公開 |
| 機械可読性 | ✅ JSON（npm配布） |
| 構造の明確さ | ✅ api/css/html/javascript の階層構造 |
| 実用場面 | ✅ VSCode, TypeScript, Firefox, Can I Use, ESLint等が利用 |

---

## 2. アーキテクチャ

### 2.1 技術スタック

| 項目 | 選定 |
|---|---|
| 言語 | TypeScript |
| MCP SDK | `@modelcontextprotocol/sdk` |
| バリデーション | Zod |
| データソース | `@mdn/browser-compat-data`, `web-features` |
| トランスポート | stdio（ローカル） / Streamable HTTP（リモート） |
| パッケージ名 | `@shuji-bonji/web-compat-mcp` |

### 2.2 プロジェクト構造

```
web-compat-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── src/
│   ├── index.ts              # エントリーポイント（McpServer初期化）
│   ├── constants.ts           # 定数（CHARACTER_LIMIT等）
│   ├── types.ts               # 型定義
│   ├── tools/
│   │   ├── compat.ts          # BCD互換性ツール群
│   │   ├── baseline.ts        # Baselineステータスツール群
│   │   ├── search.ts          # 検索ツール群
│   │   └── browsers.ts        # ブラウザ情報ツール群
│   ├── services/
│   │   ├── bcd-service.ts     # BCDデータのロード・クエリ
│   │   └── features-service.ts # web-featuresデータのロード・クエリ
│   ├── schemas/
│   │   └── input-schemas.ts   # Zodスキーマ定義
│   └── utils/
│       ├── formatter.ts       # Markdown/JSON整形ユーティリティ
│       └── error-handler.ts   # エラーハンドリング
└── dist/                      # ビルド出力
```

### 2.3 データフロー

```
npm パッケージ（ローカル）
  ├── @mdn/browser-compat-data  → JSON → BcdService（メモリ上）
  └── web-features              → JSON → FeaturesService（メモリ上）
                                            ↓
                                   MCP Tools（クエリ・整形）
                                            ↓
                                   LLM クライアント
```

**重要な設計判断**: BCD / web-features はnpmパッケージとしてローカルに持つ。
外部APIコールは不要（レイテンシゼロ、オフライン動作可能）。

---

## 3. ツール設計

### 3.1 ツール一覧

全ツールにプレフィクス `compat_` を付与（他MCPとの名前衝突回避）。

#### カテゴリA：互換性データ照会（BCDベース）

| ツール名 | 概要 | 主な用途 |
|---|---|---|
| `compat_check` | 特定機能のブラウザ互換性を取得 | 「Push APIはSafariで使える？」 |
| `compat_compare` | 複数機能の互換性を比較 | 「fetchとXHR、どちらが対応範囲広い？」 |
| `compat_search` | キーワードでBCDフィーチャーを検索 | 「service-worker関連の機能一覧」 |

#### カテゴリB：Baselineステータス照会（web-featuresベース）

| ツール名 | 概要 | 主な用途 |
|---|---|---|
| `compat_get_baseline` | 特定機能のBaselineステータスを取得 | 「CSSのcontainer queryはBaseline？」 |
| `compat_list_baseline` | Baselineステータスでフィルタした一覧 | 「Widely Availableな新CSS機能一覧」 |

#### カテゴリC：ブラウザ情報

| ツール名 | 概要 | 主な用途 |
|---|---|---|
| `compat_list_browsers` | サポート対象ブラウザ一覧 | 「BCD追跡ブラウザとバージョン」 |

#### カテゴリD：横断検索

| ツール名 | 概要 | 主な用途 |
|---|---|---|
| `compat_check_support` | ブラウザ名+バージョンで対応機能検索 | 「Safari 17.0で使えるWeb API一覧」 |

### 3.2 各ツール詳細設計

---

#### `compat_check` — 互換性チェック（コアツール）

最も使用頻度が高いメインツール。

```
入力:
  - feature (string, 必須): BCD識別子 (例: "api.PushManager", "css.properties.grid")
  - browsers (string[], 任意): フィルタするブラウザ (例: ["chrome", "safari"])
  - response_format ("markdown" | "json"): 出力形式

出力 (JSON):
  {
    "feature": "api.PushManager",
    "description": "...",
    "mdn_url": "https://developer.mozilla.org/...",
    "spec_url": "https://w3c.github.io/push-api/...",
    "baseline": { "status": "low", "low_date": "2023-03", "high_date": null },
    "support": {
      "chrome": { "version_added": "42", "flags": null },
      "safari": { "version_added": "16.4", "partial_implementation": true },
      "firefox": { "version_added": "44" },
      ...
    },
    "status": { "experimental": false, "standard_track": true, "deprecated": false }
  }

出力 (Markdown):
  # api.PushManager

  **Baseline**: 🟡 Newly Available (2023-03〜)
  **Status**: Standard Track

  ## Browser Support
  | Browser | Version | Notes |
  |---------|---------|-------|
  | Chrome  | 42+     |       |
  | Safari  | 16.4+   | ⚠️ 部分実装 |
  | Firefox | 44+     |       |

  📖 [MDN](https://developer.mozilla.org/...)
  📋 [Spec](https://w3c.github.io/push-api/...)
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`, `openWorldHint: false`

---

#### `compat_search` — フィーチャー検索

```
入力:
  - query (string, 必須): 検索キーワード (例: "push", "grid", "service-worker")
  - category (string, 任意): カテゴリフィルタ ("api" | "css" | "html" | "javascript" | ...)
  - limit (number, デフォルト: 20): 最大件数
  - offset (number, デフォルト: 0): ページネーション
  - response_format ("markdown" | "json")

出力:
  {
    "total": 45,
    "count": 20,
    "offset": 0,
    "features": [
      { "id": "api.PushManager", "description": "...", "baseline": "low" },
      { "id": "api.PushEvent", "description": "...", "baseline": "low" },
      ...
    ],
    "has_more": true,
    "next_offset": 20
  }
```

---

#### `compat_compare` — 複数機能の互換性比較

```
入力:
  - features (string[], 必須, 2〜5個): BCD識別子の配列
  - browsers (string[], 任意): フィルタするブラウザ
  - response_format ("markdown" | "json")

出力 (Markdown):
  # Feature Comparison

  | Feature | Chrome | Safari | Firefox | Baseline |
  |---------|--------|--------|---------|----------|
  | api.fetch | 42+ | 10.1+ | 39+ | ✅ Widely |
  | api.XMLHttpRequest | 1+ | 1+ | 1+ | ✅ Widely |
```

---

#### `compat_get_baseline` — Baselineステータス取得

```
入力:
  - feature (string, 必須): web-features識別子 (例: "push", "container-queries")
  - response_format ("markdown" | "json")

出力:
  {
    "id": "container-queries",
    "name": "Container queries",
    "description": "...",
    "baseline": {
      "status": "high",
      "low_date": "2023-02-14",
      "high_date": "2025-08-14"
    },
    "browser_support": {
      "chrome": "105",
      "edge": "105",
      "firefox": "110",
      "safari": "16.0"
    },
    "compat_features": [
      "css.at-rules.container",
      "css.properties.container-name",
      ...
    ],
    "spec": "https://drafts.csswg.org/css-contain-3/"
  }
```

---

#### `compat_list_baseline` — Baselineフィルタ一覧

```
入力:
  - status ("high" | "low" | false, 任意): Baselineステータスフィルタ
  - group (string, 任意): グループフィルタ (例: "css", "javascript")
  - limit (number, デフォルト: 20)
  - offset (number, デフォルト: 0)
  - response_format ("markdown" | "json")

出力:
  {
    "total": 320,
    "count": 20,
    "features": [
      { "id": "container-queries", "name": "Container queries", "baseline": "high", ... },
      ...
    ],
    "has_more": true,
    "next_offset": 20
  }
```

---

#### `compat_list_browsers` — ブラウザ情報一覧

```
入力:
  - response_format ("markdown" | "json")

出力:
  {
    "browsers": {
      "chrome": { "name": "Chrome", "type": "desktop", "current_version": "..." },
      "safari": { "name": "Safari", "type": "desktop", "current_version": "..." },
      ...
    }
  }
```

---

#### `compat_check_support` — ブラウザベースの機能検索

```
入力:
  - browser (string, 必須): ブラウザ名 (例: "safari")
  - version (string, 必須): バージョン (例: "17.0")
  - category (string, 任意): カテゴリフィルタ
  - limit (number, デフォルト: 20)
  - offset (number, デフォルト: 0)
  - response_format ("markdown" | "json")

出力:
  {
    "browser": "safari",
    "version": "17.0",
    "total_supported": 1250,
    "newly_added": [
      { "id": "api.URL.canParse_static", "version_added": "17.0" },
      ...
    ],
    "has_more": true
  }
```

---

## 4. 実装フェーズ

### Phase 1: 基盤構築（MVP）

**目標**: 最小限のツールでMCPサーバーを動かす

| 順番 | タスク | 成果物 |
|------|--------|--------|
| 1-1 | プロジェクト初期化 | package.json, tsconfig.json, .gitignore |
| 1-2 | BcdService実装 | BCDデータのロード・クエリ基盤 |
| 1-3 | FeaturesService実装 | web-featuresデータのロード・クエリ基盤 |
| 1-4 | `compat_check` 実装 | コアツール（最重要） |
| 1-5 | `compat_search` 実装 | 検索ツール |
| 1-6 | ビルド・動作確認 | `npm run build` + MCP Inspector |

### Phase 2: 機能拡充

| 順番 | タスク | 成果物 |
|------|--------|--------|
| 2-1 | `compat_get_baseline` 実装 | Baselineツール |
| 2-2 | `compat_list_baseline` 実装 | Baselineフィルタ |
| 2-3 | `compat_compare` 実装 | 比較ツール |
| 2-4 | `compat_list_browsers` 実装 | ブラウザ情報 |
| 2-5 | `compat_check_support` 実装 | ブラウザベース検索 |

### Phase 3: 品質・公開

| 順番 | タスク | 成果物 |
|------|--------|--------|
| 3-1 | エラーハンドリング強化 | アクション可能なエラーメッセージ |
| 3-2 | README.md作成 | 使い方・設定ドキュメント |
| 3-3 | npm公開準備 | `@shuji-bonji/web-compat-mcp` |
| 3-4 | GitHub Actions CI | ビルド・lint自動化 |
| 3-5 | テスト・Evaluation | MCP Inspector + 評価セット |

---

## 5. 設計上の重要な判断

### 5.1 ローカルデータ vs API呼び出し

**判断: ローカルデータ（npmパッケージ）を採用**

理由:
- BCD / web-features はnpmパッケージで配布されている
- 外部APIが不要 → レイテンシゼロ、認証不要、オフライン動作
- MCPサーバー起動時にメモリにロード → クエリが高速
- パッケージ更新は`npm update`で対応

トレードオフ:
- 最新データを得るには`npm update`が必要
- メモリ使用量はBCD全体で約50-60MB程度（許容範囲）

### 5.2 BCD識別子 vs web-features識別子

2つのデータソースは異なる粒度のIDを使用する。

```
BCD (細粒度):           web-features (粗粒度):
  api.PushManager       →  "push"
  api.PushEvent         →
  api.PushSubscription  →

  css.properties.grid-template-columns → "grid"
  css.properties.grid-template-rows    →
  css.properties.grid-area             →
```

**判断**: 両方のID体系をサポートする
- `compat_check` / `compat_search` → BCD識別子
- `compat_get_baseline` / `compat_list_baseline` → web-features識別子
- web-features → BCD の `compat_features` マッピングで相互参照

### 5.3 トランスポート

**判断: stdio をデフォルト、Streamable HTTP もサポート**

理由:
- ローカルデータのみ → stdio で十分
- Claude Desktop / Claude Code はstdioを使う
- 将来的なリモート利用も見据えてHTTPもサポート

### 5.4 レスポンスフォーマット

全ツールで `response_format` パラメータをサポート:
- `"markdown"` (デフォルト): LLMの文脈に最適化した人間可読形式
- `"json"`: 構造化データ（プログラマティック処理向け）

---

## 6. W3C MCPとの連携イメージ

```
ユーザー: 「Push APIをPWAで使いたいが、実装可能？」

  Step 1: Web Compat MCP
    → compat_check("api.PushManager")
    → Chrome 42+, Safari 16.4+ (部分), Firefox 44+
    → Baseline: Newly Available

  Step 2: W3C MCP
    → get_w3c_spec("push-api")
    → 仕様のステータス、WebIDL定義

  Step 3: Web Compat MCP
    → compat_get_baseline("push")
    → 全サブ機能のサポート状況、注意事項

  → LLMが総合判断:
    「Push APIは主要ブラウザで利用可能ですが、
     iOS Safariでは16.4以降の部分サポートに注意が必要です。
     Baseline Newly Availableなので、広く普及するのは2025年後半以降の見込みです。」
```

---

## 7. 競合分析と棲み分け戦略

### 7.1 既存の類似MCP Server

| MCP Server | データソース | スコープ | Baseline | オフライン | 成熟度 |
|---|---|---|---|---|---|
| MDN MCP (`mdn/mcp`) | MDN API | MDNドキュメント全般 | ❌ | ❌ (API) | 実験的 (16★) |
| caniuse-mcp | CanIUse + BCD + web-features | 単機能ルックアップ | ✅ | ❌ (リアルタイム) | npm公開済 |
| css-mcp (`stolinski/css-mcp`) | MDN API + BCD | CSS特化 + コード分析 | ❌ | ❌ (キャッシュ) | 328★ |
| **Web Compat MCP** | BCD + web-features | **Web Platform全体** | ✅ | **✅ (完全)** | **計画中** |

### 7.2 css-mcp との併用戦略

css-mcpは「CSS特化のドキュメント+コード分析」として併用する。

```
css-mcp が担当:
  ✅ CSSプロパティのMDNドキュメント取得
  ✅ CSS特化のBCD互換性チェック
  ✅ CSSコード品質分析（150+メトリクス）  ← ユニーク
  ✅ プロジェクトCSS一括分析              ← ユニーク

Web Compat MCP が担当:
  ✅ Web API (PushManager, ServiceWorker等) の互換性
  ✅ HTML/JavaScript/SVG/WebAssembly等の互換性
  ✅ Baselineステータス判定              ← ユニーク
  ✅ 複数機能の比較                      ← ユニーク
  ✅ ブラウザ+バージョン指定の逆引き      ← ユニーク
  ✅ 完全オフライン動作                  ← ユニーク
```

### 7.3 差別化の3軸

**① 完全オフライン**: npmパッケージから直接読むため、APIダウンやレイテンシ問題がない
**② 比較・フィルタ・逆引き**: `compat_compare`, `compat_list_baseline`, `compat_check_support` は既存MCPにない
**③ Web Platform全体のスコープ**: CSS以外のAPI/HTML/JS/SVG/WebAssembly等すべてをカバー

### 7.4 仕様系MCPとの補完関係

| 観点 | W3C MCP | RFCXML MCP | **Web Compat MCP** |
|------|---------|------------|-------------------|
| データソース | W3C/WHATWG仕様 | IETF RFC | BCD + web-features |
| 提供する情報 | 仕様のセマンティクス | プロトコル仕様 | **ブラウザ実装状況** |
| 解決する問い | 「仕様は何と言っている？」 | 「RFCの要件は？」 | **「実際に動く？」** |
| 粒度 | 仕様単位 | RFC単位 | **機能単位** |
| 更新頻度 | 仕様改訂時 | RFC発行時 | **週単位（BCD）** |

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| BCDのメモリ消費が大きい | サーバー起動が遅い | 遅延ロード / カテゴリ別ロード検討 |
| BCD識別子の入力が難しい | ユーザビリティ低下 | `compat_search`で補完、曖昧検索対応 |
| BCD / web-features のスキーマ変更 | ビルド失敗 | npm lockfile + CI + 型チェック |
| 類似MCPの登場 | 差別化困難 | 早期公開 + Baselineデータの付加価値 |

---

## 9. 成功指標

- [ ] Phase 1 (MVP): `compat_check` + `compat_search` が動作する
- [ ] Phase 2: 全7ツールが動作する
- [ ] Phase 3: npm公開 + GitHub README完成
- [ ] W3C MCPと組み合わせた実用デモができる
- [ ] MCP Inspector での動作確認が通る

---

## 付録: 参考リンク

- [MDN Browser Compat Data (BCD)](https://github.com/mdn/browser-compat-data)
- [web-features (W3C WebDX CG)](https://github.com/web-platform-dx/web-features)
- [Baseline | web.dev](https://web.dev/baseline)
- [Create Baseline tools with web-features](https://web.dev/articles/baseline-tools-web-features)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Protocol Specification](https://modelcontextprotocol.io/specification/draft)
