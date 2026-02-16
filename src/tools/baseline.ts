/**
 * Baseline tools — compat_get_baseline, compat_list_baseline
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CompatGetBaselineInputSchema,
  CompatListBaselineInputSchema,
  type CompatGetBaselineInput,
  type CompatListBaselineInput,
} from "../schemas/input-schemas.js";
import { ResponseFormat } from "../constants.js";
import {
  getBaselineStatus,
  listByBaseline,
} from "../services/features-service.js";
import {
  formatBaselineMarkdown,
  formatBaselineListMarkdown,
  truncateIfNeeded,
} from "../utils/formatter.js";
import { webFeatureNotFoundError, handleError } from "../utils/error-handler.js";

export function registerBaselineTools(server: McpServer): void {
  server.registerTool(
    "compat_get_baseline",
    {
      title: "Get Baseline Status",
      description: `Get the Baseline status for a web platform feature from W3C WebDX web-features data.

Baseline indicates whether a feature is supported across all major browsers:
- "high" (Widely Available): Supported for 30+ months across all core browsers
- "low" (Newly Available): Recently became interoperable across all core browsers
- false (Not Baseline): Not yet supported across all core browsers

Args:
  - feature (string): web-features identifier in kebab-case (e.g., "container-queries", "push", "view-transitions")
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Baseline status, browser support versions, related BCD features, and spec links.

Examples:
  - "Is container queries Baseline?" → feature: "container-queries"
  - "Is the Push API widely available?" → feature: "push"
  - "Check View Transitions baseline" → feature: "view-transitions"`,
      inputSchema: CompatGetBaselineInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatGetBaselineInput) => {
      try {
        const result = getBaselineStatus(params.feature);

        if (!result) {
          return {
            content: [
              { type: "text" as const, text: webFeatureNotFoundError(params.feature) },
            ],
          };
        }

        if (params.response_format === ResponseFormat.JSON) {
          const text = JSON.stringify(result, null, 2);
          return {
            content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
            structuredContent: result,
          };
        }

        const markdown = formatBaselineMarkdown(result);
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

  server.registerTool(
    "compat_list_baseline",
    {
      title: "List Features by Baseline Status",
      description: `List web platform features filtered by their Baseline status.

Use this to discover which features are Widely Available, Newly Available, or not yet Baseline.

Args:
  - status (string, optional): Filter by "high" (Widely Available), "low" (Newly Available), or "false" (Not Baseline)
  - group (string, optional): Filter by feature group (e.g., "css", "javascript", "forms")
  - limit (number): Max results (default: 20, max: 100)
  - offset (number): Pagination offset (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Paginated list of features with their Baseline status and availability dates.

Examples:
  - "List all Widely Available features" → status: "high"
  - "What CSS features are Newly Available?" → status: "low", group: "css"
  - "What features aren't Baseline yet?" → status: "false"`,
      inputSchema: CompatListBaselineInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatListBaselineInput) => {
      try {
        // Convert "false" string to boolean false
        const statusFilter =
          params.status === "false"
            ? false
            : (params.status as "high" | "low" | undefined);

        const results = listByBaseline(
          statusFilter,
          params.group,
          params.limit,
          params.offset
        );

        if (results.total === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No features found matching the specified filters.",
              },
            ],
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

        const markdown = formatBaselineListMarkdown(results, params.status);
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
