#!/usr/bin/env node
/**
 * Web Compat MCP Server
 *
 * Provides browser compatibility data from MDN BCD and W3C WebDX web-features
 * for the entire Web Platform. Complements W3C MCP (specs) and RFCXML MCP (RFCs)
 * by answering "Does this actually work in browsers?"
 *
 * Data is fully local (npm packages) — no network requests, zero latency, offline capable.
 *
 * @author shuji-bonji
 * @see https://github.com/shuji-bonji/web-compat-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerBaselineTools } from "./tools/baseline.js";
import { registerBrowserTools } from "./tools/browsers.js";
import { registerCompatTools } from "./tools/compat.js";
import { registerSearchTools } from "./tools/search.js";

// Create MCP server instance
const server = new McpServer({
  name: "web-compat-mcp",
  version: "0.1.0",
});

// Register all tools
registerCompatTools(server);
registerSearchTools(server);
registerBaselineTools(server);
registerBrowserTools(server);

// Run with stdio transport
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("web-compat-mcp server running via stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
