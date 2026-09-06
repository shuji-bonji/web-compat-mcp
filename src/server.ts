/**
 * Server factory for web-compat-mcp
 *
 * Builds a fully-registered McpServer. Kept separate from the stdio entry point
 * (index.ts) so that `serveStdio` can call it once per connection and tests can
 * connect to the same server without spawning a process.
 */

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/server";
import { registerBaselineTools } from "./tools/baseline.js";
import { registerBrowserTools } from "./tools/browsers.js";
import { registerCompatTools } from "./tools/compat.js";
import { registerSearchTools } from "./tools/search.js";

// Read version from package.json dynamically
const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

export const SERVER_NAME = "web-compat-mcp";

/**
 * Text returned to the client in the `initialize` response (`instructions`).
 *
 * The client places it in its system context before any tool is chosen, so it
 * is the earliest place to state what this server is NOT. Each line exists to
 * prevent a specific misreading:
 *   - "lookup, not verdict": the server reports data from BCD / web-features;
 *     it does not decide whether a feature is safe to ship.
 *   - identifier shapes: BCD dot-notation vs web-features kebab-case is the
 *     most frequent cause of "not found" replies.
 *   - "not found" != "does not exist": the data set is a snapshot bundled with
 *     the npm package; a miss says nothing about the platform.
 *   - where to go for specs / RFCs: w3c-mcp and rfcxml-mcp cover those.
 * Keep it short — it is resent on every connection and consumes context.
 */
export const INSTRUCTIONS = `web-compat-mcp answers "does this web platform feature work in browser X?" from bundled MDN Browser Compat Data (BCD) and W3C WebDX web-features (Baseline). It is a data lookup, not a verdict engine: it does not decide whether a feature is acceptable to use.

Identifiers differ per data source:
- compat_check / compat_compare / compat_search use BCD dot notation ("api.PushManager", "css.properties.grid").
- compat_get_baseline / compat_list_baseline use web-features kebab-case IDs ("push", "container-queries").
When unsure of an identifier, call compat_search first.

A "not found" reply means the bundled data set has no entry under that identifier — NOT that the feature does not exist. The data is a snapshot from the npm package (see compat_list_browsers for the newest browser versions it knows about); it is not fetched live.

Specification text is out of scope: use w3c-mcp (get_w3c_spec, get_webidl) for W3C/WHATWG specs and rfcxml-mcp for RFCs.`;

/**
 * Build a McpServer with every tool registered.
 *
 * Called once per stdio connection by `serveStdio` (and once more when a
 * 2026-07-28 `server/discover` probe is followed by a 2025-era `initialize`).
 * The BCD / web-features JSON is loaded at module scope in the services, so
 * repeated calls only re-register tool handlers.
 */
export function buildServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version },
    {
      instructions: INSTRUCTIONS,
      // Bundled data never changes while the process runs, so 2026-07-28 clients
      // may cache the tool list; 2025-era responses are unaffected.
      cacheHints: { "tools/list": { ttlMs: 86_400_000, cacheScope: "public" } },
    }
  );

  registerCompatTools(server);
  registerSearchTools(server);
  registerBaselineTools(server);
  registerBrowserTools(server);

  return server;
}
