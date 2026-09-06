#!/usr/bin/env node
/**
 * Web Compat MCP Server — stdio entry point
 *
 * Provides browser compatibility data from MDN BCD and W3C WebDX web-features
 * for the entire Web Platform. Complements W3C MCP (specs) and RFCXML MCP (RFCs)
 * by answering "Does this actually work in browsers?"
 *
 * Data is fully local (npm packages) — no network requests, zero latency, offline capable.
 *
 * `serveStdio` inspects the first message of the connection and serves either
 * the 2025-era `initialize` handshake or the 2026-07-28 `server/discover`
 * revision from the same factory; tool handlers do not need to know which.
 *
 * @author shuji-bonji
 * @see https://github.com/shuji-bonji/web-compat-mcp
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { buildServer, SERVER_NAME } from "./server.js";

serveStdio(buildServer, {
  onerror: (error) => console.error("Server error:", error),
});

// Keep this line: tests/e2e waits for it on stderr before sending requests.
console.error(`${SERVER_NAME} server running via stdio`);
