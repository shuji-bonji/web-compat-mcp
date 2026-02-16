# @shuji-bonji/web-compat-mcp

[![CI](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/shuji-bonji/web-compat-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@shuji-bonji/web-compat-mcp)](https://www.npmjs.com/package/@shuji-bonji/web-compat-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MCP server providing browser compatibility data for the entire Web Platform.**

Answers the question: _"Does this actually work in browsers?"_

Uses [MDN Browser Compat Data (BCD)](https://github.com/mdn/browser-compat-data) (15,000+ features) and [W3C WebDX web-features](https://github.com/nicolo-ribaudo/tc39-proposal-scope-functions) (1,000+ features with Baseline status) to provide real-world browser implementation status.

> **Fully offline** — all data is bundled via npm packages. No API calls, zero latency.

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
│                   │ stdio / Streamable HTTP │
└───────────────────┼─────────────────────────┘
                    │
            MCP Client (Claude, etc.)
```

## Tools

| Tool | Description |
|------|-------------|
| `compat_check` | Check browser compatibility for a single feature (BCD dot notation) |
| `compat_search` | Search BCD features by keyword |
| `compat_get_baseline` | Get Baseline status for a web feature (web-features kebab-case) |
| `compat_list_baseline` | List features filtered by Baseline status |
| `compat_compare` | Compare browser compatibility across 2-5 features side by side |
| `compat_list_browsers` | List all tracked browsers with versions |
| `compat_check_support` | Find features added in a specific browser version |

## Installation

### npm (global)

```bash
npm install -g @shuji-bonji/web-compat-mcp
```

### npx (no install)

```bash
npx @shuji-bonji/web-compat-mcp
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

### Compare features

> "Compare fetch vs XMLHttpRequest"

```
→ compat_compare features: ["api.fetch", "api.XMLHttpRequest"]
```

### Check Baseline status

> "Is container queries Baseline?"

```
→ compat_get_baseline feature: "container-queries"
```

### Find features by browser version

> "What CSS features were added in Chrome 120?"

```
→ compat_check_support browser: "chrome" version: "120" category: "css"
```

## Complementary MCP Servers

This server is designed to work alongside other MCP servers:

| Server | Role | This Server's Complement |
|--------|------|--------------------------|
| **W3C MCP** | Spec definitions (MUST/SHOULD/MAY) | Real browser implementation status |
| **RFCXML MCP** | RFC requirements | Browser-level protocol support |
| **css-mcp** | CSS docs + code analysis | Platform-wide compat + Baseline |

## Data Sources

| Source | Package | Features | Update Frequency |
|--------|---------|----------|-----------------|
| [MDN BCD](https://github.com/mdn/browser-compat-data) | `@mdn/browser-compat-data` | 15,000+ | Weekly |
| [web-features](https://github.com/nicolo-ribaudo/tc39-proposal-scope-functions) | `web-features` | 1,000+ | Monthly |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test              # Unit tests
npm run test:e2e      # E2E tests (JSON-RPC)

# Lint & format
npm run lint          # Check
npm run lint:fix      # Auto-fix
npm run format        # Format

# Type check
npm run typecheck
```

## License

MIT
