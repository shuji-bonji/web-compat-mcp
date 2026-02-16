/**
 * Search tools — compat_search
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CompatSearchInput, CompatSearchInputSchema } from "../schemas/input-schemas.js";
import { searchFeatures } from "../services/bcd-service.js";
import { handleError } from "../utils/error-handler.js";
import { formatSearchMarkdown } from "../utils/formatter.js";
import { formatToolResponse, paginatedOutput, textResponse } from "../utils/tool-helpers.js";

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
        const results = searchFeatures(params.query, params.category, params.limit, params.offset);

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
          return textResponse(suggestions.join("\n"));
        }

        const output = paginatedOutput(
          { features: results.features },
          results.features,
          results.total,
          params.offset,
          results.has_more
        );

        return formatToolResponse(params.response_format, output, () =>
          formatSearchMarkdown(results, params.query)
        );
      } catch (error) {
        return textResponse(handleError(error));
      }
    }
  );
}
