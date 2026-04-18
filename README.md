# Web Compat MCP server

[![CI](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shuji-bonji/web-compat-mcp)](https://www.npmjs.com/package/@shuji-bonji/web-compat-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MCP server providing browser compatibility data for the entire Web Platform.**

Answers the question: _"Does this actually work in browsers?"_

Uses [MDN Browser Compat Data (BCD)](https://github.com/mdn/browser-compat-data) (15,000+ features) and [W3C WebDX web-features](https://github.com/web-platform-dx/web-features) (1,000+ features with Baseline status) to provide real-world browser implementation status.

> **Fully offline** — all data is bundled via npm packages. No API calls, zero latency.

🇯🇵 [日本語版 README はこちら](./README.ja.md)

## Architecture

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
│          │   cross-reference │              │
│          └────────┬──────────┘              │
│                   │                         │
│          ┌────────▼────────┐                │
│          │   7 MCP Tools   │                │
│          └────────┬────────┘                │
│                   │ stdio                   │
└───────────────────┼─────────────────────────┘
                    │
            MCP Client (Claude, etc.)
```

## Tools

| Tool                   | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `compat_check`         | Check browser compatibility for a single feature (BCD dot notation) |
| `compat_search`        | Search 15,000+ BCD features by keyword                              |
| `compat_get_baseline`  | Get Baseline status for a web feature (web-features kebab-case)     |
| `compat_list_baseline` | List features filtered by Baseline status                           |
| `compat_compare`       | Compare browser compatibility across 2–5 features side by side      |
| `compat_list_browsers` | List all tracked browsers with versions                             |
| `compat_check_support` | Find features added in a specific browser version                   |

### Identifier conventions

The two data sources use different identifier schemes, and each tool expects a specific one:

| Tool                                             | Scheme                                                 | Example                                   |
| ------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------- |
| `compat_check`, `compat_compare`, `compat_search` | **BCD dot notation** — fine-grained, often camelCase   | `api.PushManager`, `css.properties.grid`  |
| `compat_get_baseline`, `compat_list_baseline`    | **web-features kebab-case** — coarse, feature-group    | `push`, `container-queries`               |
| `compat_check_support`                           | Browser id + version string                            | `safari` + `17`                           |

BCD is fine-grained (`api.PushManager`, `api.PushEvent`, `api.PushSubscription` are separate entries) while web-features groups related specs into a single feature (`push` covers all three). When unsure of the exact identifier, run `compat_search` first. Input normalization handles kebab-case queries (`view-transition` → `viewtransition`) and trailing `.0` versions (`17.0` → `17`) automatically.

## Quick Start

### npx (no install)

```bash
npx @shuji-bonji/web-compat-mcp
```

### npm (global)

```bash
npm install -g @shuji-bonji/web-compat-mcp
web-compat-mcp
```

## MCP Client Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

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

Add to `.vscode/mcp.json`:

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

## Usage Examples

### Check browser compatibility

> "Is Push API supported in Safari?"

```
→ compat_check feature: "api.PushManager"
```

Returns version support across browsers, Baseline status, and links to MDN/spec documentation.

### Search features

> "Find CSS grid features"

```
→ compat_search query: "grid" category: "css"
```

Returns matching feature IDs with standard/experimental/deprecated flags.

### Compare features

> "Compare fetch vs XMLHttpRequest"

```
→ compat_compare features: ["api.fetch", "api.XMLHttpRequest"]
```

Returns side-by-side comparison table with version support and Baseline status.

### Check Baseline status

> "Is container queries Baseline?"

```
→ compat_get_baseline feature: "container-queries"
```

Returns Baseline level (Widely Available / Newly Available / Not Baseline), browser support, and related BCD features.

### Find features by browser version

> "What CSS features were added in Chrome 120?"

```
→ compat_check_support browser: "chrome" version: "120" category: "css"
```

Returns features added in the specified browser version.

### Workflow: combining multiple tools

> "I want to use Push API in my PWA — is it realistic today?"

```
Step 1 → compat_check        feature: "api.PushManager"
         # Per-API browser versions (Chrome 42+, Safari 16+, Firefox 44+)

Step 2 → compat_get_baseline  feature: "push"
         # Feature-group view: Newly Available since 2023-03-27

Step 3 → compat_compare       features: ["api.PushManager", "api.Notification"]
         # Side-by-side when your PWA depends on both
```

Chained with a spec-oriented server such as **W3C MCP** or **RFCXML MCP**, the LLM can answer both _"what does the spec require?"_ and _"what actually works in browsers today?"_ in a single conversation.

## Output Formats

All tools support `response_format` parameter:

- `"markdown"` (default) — Human-readable tables and formatted text
- `"json"` — Structured data with `structuredContent` for programmatic use

## Complementary MCP Servers

This server is designed to work alongside other MCP servers:

| Server         | Role                               | This Server's Complement           |
| -------------- | ---------------------------------- | ---------------------------------- |
| **W3C MCP**    | Spec definitions (MUST/SHOULD/MAY) | Real browser implementation status |
| **RFCXML MCP** | RFC requirements                   | Browser-level protocol support     |
| **css-mcp**    | CSS docs + code analysis           | Platform-wide compat + Baseline    |

## Data Sources

| Source                                                          | Package                    | Features | Update Frequency |
| --------------------------------------------------------------- | -------------------------- | -------- | ---------------- |
| [MDN BCD](https://github.com/mdn/browser-compat-data)           | `@mdn/browser-compat-data` | 15,000+  | Weekly           |
| [web-features](https://github.com/web-platform-dx/web-features) | `web-features`             | 1,000+   | Monthly          |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test              # Unit tests (66 tests)
npm run test:e2e      # E2E tests via JSON-RPC (10 tests)

# Lint & format (Biome 2.x)
npm run lint          # Check
npm run lint:fix      # Auto-fix
npm run format        # Format

# Type check
npm run typecheck
```

## License

MIT — see [LICENSE](./LICENSE)
