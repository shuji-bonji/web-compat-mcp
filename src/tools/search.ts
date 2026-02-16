/**
 * Search tools — compat_search
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CompatSearchInputSchema,
  type CompatSearchInput,
} from "../schemas/input-schemas.js";
import { ResponseFormat } from "../constants.js";
import { searchFeatures } from "../services/bcd-service.js";
import { formatSearchMarkdown, truncateIfNeeded } from "../utils/formatter.js";
import { handleError } from "../utils/error-handler.js";

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "compat_search",
    {
      title: "Search Web Platform Features",
      description: `Search BCD (Browser Compat Data) features by keyword. Use this to find the correct BCD identifier for compat_check.

Searches across 15,000+ web platform features including APIs, CSS properties, HTML elements, JavaScript built-ins, and more.

Args:
  - query (string): Search keyword (e.g., "push", "grid", "service-worker", "fetch")
  - category (string, optional): Filter by category ("api", "css", "html", "javascript", "svg", etc.)
  - limit (number): Max results (default: 20, max: 100)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of matching feature IDs with standard/experimental/deprecated status.

Examples:
  - "Find Push API features" → query: "push", category: "api"
  - "Find CSS grid features" → query: "grid", category: "css"
  - "Find all service worker APIs" → query: "serviceworker", category: "api"`,
      inputSchema: CompatSearchInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatSearchInput) => {
      try {
        const results = searchFeatures(
          params.query,
          params.category,
          params.limit,
          params.offset
        );

        if (results.total === 0) {
          const suggestions = [
            `No features found matching "${params.query}".`,
            "",
            "Suggestions:",
            "  - Try a broader search term",
            "  - BCD uses camelCase for API names (e.g., 'PushManager' not 'push-manager')",
            params.category
              ? `  - Try without the category filter to search all categories`
              : "  - Try filtering by category: api, css, html, javascript",
          ];
          return {
            content: [{ type: "text" as const, text: suggestions.join("\n") }],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          const output = {
            total: results.total,
            count: results.features.length,
            offset: params.offset,
            features: results.features,
            has_more: results.has_more,
            ...(results.has_more
              ? { next_offset: params.offset + results.features.length }
              : {}),
          };
          const text = JSON.stringify(output, null, 2);
          return {
            content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
            structuredContent: output,
          };
        }

        const markdown = formatSearchMarkdown(results, params.query);
        return {
          content: [{ type: "text" as const, text: truncateIfNeeded(markdown) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: handleError(error) }],
        };
      }
    }
  );
}
