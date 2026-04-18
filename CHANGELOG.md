# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
