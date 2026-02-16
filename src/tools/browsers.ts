/**
 * Browser tools — compat_list_browsers, compat_check_support
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CompatListBrowsersInputSchema,
  CompatCheckSupportInputSchema,
  type CompatListBrowsersInput,
  type CompatCheckSupportInput,
} from "../schemas/input-schemas.js";
import { ResponseFormat } from "../constants.js";
import {
  getBrowsers,
  findFeaturesByBrowserVersion,
} from "../services/bcd-service.js";
import {
  formatBrowsersMarkdown,
  formatCheckSupportMarkdown,
  truncateIfNeeded,
} from "../utils/formatter.js";
import { handleError } from "../utils/error-handler.js";

export function registerBrowserTools(server: McpServer): void {
  // compat_list_browsers — List tracked browsers
  server.registerTool(
    "compat_list_browsers",
    {
      title: "List Tracked Browsers",
      description: `List all browsers tracked in MDN Browser Compat Data with their current versions and release dates.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of browsers with id, name, type (desktop/mobile/server), current version, and release date.

Examples:
  - "What browsers are tracked?" → no params needed
  - "List all browser versions" → no params needed`,
      inputSchema: CompatListBrowsersInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatListBrowsersInput) => {
      try {
        const browsers = getBrowsers();

        if (params.response_format === ResponseFormat.JSON) {
          const output = { total: browsers.length, browsers };
          const text = JSON.stringify(output, null, 2);
          return {
            content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
            structuredContent: output,
          };
        }

        const markdown = formatBrowsersMarkdown(browsers);
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

  // compat_check_support — Find features supported in a specific browser version
  server.registerTool(
    "compat_check_support",
    {
      title: "Check Browser Version Support",
      description: `Find web platform features that were added in a specific browser version.

Useful for understanding what new capabilities became available in a particular browser release.

Args:
  - browser (string): Browser identifier (e.g., "safari", "chrome", "firefox")
  - version (string): Browser version (e.g., "17.0", "120", "121")
  - category (string, optional): Filter by BCD category (e.g., "api", "css")
  - limit (number): Max results (default: 20, max: 100)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  List of features added in the specified browser version.

Examples:
  - "What was added in Safari 17.0?" → browser: "safari", version: "17.0"
  - "New CSS features in Chrome 120" → browser: "chrome", version: "120", category: "css"
  - "Firefox 121 API additions" → browser: "firefox", version: "121", category: "api"`,
      inputSchema: CompatCheckSupportInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatCheckSupportInput) => {
      try {
        const results = findFeaturesByBrowserVersion(
          params.browser,
          params.version,
          params.category,
          params.limit,
          params.offset
        );

        if (results.total === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No features found for ${params.browser} version ${params.version}${
                  params.category ? ` in category "${params.category}"` : ""
                }. Try a different version or check with \`compat_list_browsers\` for available browsers.`,
              },
            ],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          const output = {
            browser: params.browser,
            version: params.version,
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

        const markdown = formatCheckSupportMarkdown(
          params.browser,
          params.version,
          results
        );
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
