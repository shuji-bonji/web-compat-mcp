# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-06

### Changed

- **データパッケージを更新**: `@mdn/browser-compat-data` 6.1 → 8.1（Chrome 152 / Safari 26.6 / Firefox 142 まで。`bun` が server 系ブラウザとして追加）、`web-features` 2.49 → 3.37。
- **web-features 3.x の `kind` に対応**: `kind: "moved"` / `kind: "split"` のリダイレクトエントリ（`name` / `status` を持たない）を一覧・検索から除外。`compat_get_baseline` に `moved` の旧 ID を渡すと新 ID の結果を返し `redirected_from` を付ける。`split` の旧 ID は後継 ID の一覧をエラーメッセージで案内する。
- **`group` が配列になった変更に追従**: `compat_list_baseline` の `group` フィルタは、複数グループに属する機能のどのグループでも一致するようにした（従来は 3.x のデータでは一致しなかった）。
- **起動方式を `serveStdio(buildServer)` に変更**: 2025 世代の `initialize` と 2026-07-28 版の `server/discover` の両方を同じサーバー定義で受け付ける。従来のクライアントの動作は変わらない。`tools/list` には 2026 版クライアント向けのキャッシュヒント（`ttlMs: 86400000`, `cacheScope: "public"`）を付ける。

### Added

- **`instructions`**: `initialize` / `server/discover` の応答で、このサーバーの射程（データ参照であって判定器ではない、識別子の形式、"not found" の意味、仕様本文は w3c-mcp / rfcxml-mcp へ）をクライアントに伝える。
- `src/server.ts` — `buildServer()` と `INSTRUCTIONS` を `index.ts` から分離。
- `BaselineFeatureResult` に `groups`（全グループ）、`discouraged`（web-features の非推奨情報）、`redirected_from` を追加。`group` は先頭グループとして残す。
- `resolveFeatureRedirect()` と、web-features 3.x の各 kind に対するユニットテスト 7 件。

### Build

- `vitest` 4 → 5、`@types/node` 22 → 24。
- README の起動例を `npx -y @shuji-bonji/web-compat-mcp@latest` に統一（タグなし指定は `npx` のキャッシュが更新されない）。`.gitignore` に Claude Desktop のローカルファイルを追加。

## [0.2.0] - 2026-09-06

### Changed

- **MCP SDK v2 へ移行**: `@modelcontextprotocol/sdk` (v1) を廃止し、`@modelcontextprotocol/server` ^2.0.0 に置き換え。import 先は `@modelcontextprotocol/server` / `@modelcontextprotocol/server/stdio`。`registerTool` の `inputSchema` には zod の raw shape (`Schema.shape`) ではなく `z.object()` のスキーマそのものを渡す形に変更 (7 ツール)。起動方式は従来どおり `server.connect(new StdioServerTransport())` で、`initialize` ハンドシェイク (2025 世代プロトコル) の挙動は変わらない。
- **zod 4**: SDK v2 の要件 (zod >= 4.2.0) に合わせて `zod` を `^4.2.0` に更新。`z.nativeEnum()` を `z.enum()` に置き換え。`tools/list` が返す `inputSchema` は `$schema` が draft-07 から JSON Schema 2020-12 になる以外は同一。
- **Node.js 22 以上を要件化**: `engines.node` を `>=22` に引き上げ (Node 20 は 2026-04-30 に EOL)。CI のテストマトリクスを Node 22 / 24 に変更。
- **TypeScript 7**: `typescript` を `^7.0.2` (Go 製ネイティブ tsc) に更新。TS 7 で `types` の既定値が空になったため `tsconfig.json` に `"types": ["node"]` を追加。出力される JS は 5.9 と同一。

### Migration notes

- 利用者側 (`npx @shuji-bonji/web-compat-mcp`) に必要な作業はない。Node 20 以下の環境では起動できなくなる。

## [0.1.5] - 2026-07-14

### Added

- **`.claude-plugin/plugin.json` を追加**: Claude Code の plugin / marketplace からインストール可能に。`mcpServers.web-compat` は `npx -y @shuji-bonji/web-compat-mcp@latest` を実行する。

## [0.1.4] - 2026-05-09

### Build

- **build script に `chmod +x dist/index.js` を追加**: local dev で `./dist/index.js` を直接実行した際の `permission denied` を回避。npm install / npx 経由の通常利用には影響なし (npm が install 時に bin を chmod するため)。shuji 製 MCP 全体で build script を統一。

## [0.1.3] - 2026-04-18

### Changed

- **`compat_search`**: Input queries are now normalized with a kebab-case / snake_case
  fallback. When the original query (e.g., `view-transition`, `push-manager`) yields
  zero matches, a stripped variant (`viewtransition`, `pushmanager`) is retried so
  that BCD's camelCase identifiers can be reached without the user knowing the exact
  casing. Responses include `used_query` and `fallback_applied` so callers can tell
  when normalization kicked in.
- **`compat_check_support`**: Input versions are now normalized by stripping trailing
  `.0` segments (`17.0` → `17`, `1.0.0` → `1`). BCD stores `version_added` as bare
  strings, so this prevents a common false-negative. Responses include `used_version`
  and `fallback_applied`.

### Added

- `src/utils/normalize.ts` — pure candidate-list normalizers shared by both tools.
- Unit tests for the normalizer and for the fallback behavior in `bcd-service`.

## [0.1.2] - 2026-04-16

### Changed

- Migrate npm publish to Trusted Publisher (OIDC)
- Update dependencies

### Fixed

- Add missing CHANGELOG link for v0.1.1

## [0.1.1] - 2026-02-17

Title change.

## [0.1.0] - 2026-02-17

### Added

- **7 MCP Tools** for browser compatibility queries:
  - `compat_check` — Check browser compatibility for a specific BCD feature
  - `compat_search` — Search 15,000+ BCD features by keyword
  - `compat_get_baseline` — Get W3C Baseline status for a web feature
  - `compat_list_baseline` — List features filtered by Baseline status
  - `compat_compare` — Compare compatibility across 2–5 features side by side
  - `compat_list_browsers` — List all tracked browsers with current versions
  - `compat_check_support` — Find features added in a specific browser version
- **Dual data source architecture**:
  - MDN Browser Compat Data (`@mdn/browser-compat-data`) — 15,000+ features
  - W3C WebDX web-features (`web-features`) — 1,000+ features with Baseline status
- **BCD ↔ web-features cross-reference** via `compat_features` mapping and BCD tags
- **Fully offline** — all data bundled via npm packages, no API calls
- **Markdown and JSON output formats** for all tools
- **Pagination support** with `limit`, `offset`, and `next_offset`
- Performance optimizations:
  - Lazy-initialized BCD feature path index (avoids full tree traversal on every search)
  - Reverse index for BCD-to-web-features lookup (O(1) instead of O(n))
  - Browser data caching (immutable data cached after first access)
- CI/CD:
  - GitHub Actions CI (lint, typecheck, test matrix on Node 18/20/22, build)
  - GitHub Actions publish workflow (npm publish with provenance on release)
- Quality:
  - Biome 2.x for formatting and linting (zero warnings)
  - Vitest unit tests (66 tests) and E2E tests (10 tests)
  - Strict TypeScript with zero `any` usage
- MCP client configuration examples for Claude Desktop, Claude Code, and VS Code

[0.1.3]: https://github.com/shuji-bonji/web-compat-mcp/releases/tag/v0.1.3
[0.1.2]: https://github.com/shuji-bonji/web-compat-mcp/releases/tag/v0.1.2
[0.1.1]: https://github.com/shuji-bonji/web-compat-mcp/releases/tag/v0.1.1
[0.1.0]: https://github.com/shuji-bonji/web-compat-mcp/releases/tag/v0.1.0
