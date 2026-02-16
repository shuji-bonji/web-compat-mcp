/**
 * Baseline tools — compat_get_baseline, compat_list_baseline
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type CompatGetBaselineInput,
  CompatGetBaselineInputSchema,
  type CompatListBaselineInput,
  CompatListBaselineInputSchema,
} from "../schemas/input-schemas.js";
import { getBaselineStatus, listByBaseline } from "../services/features-service.js";
import { handleError, webFeatureNotFoundError } from "../utils/error-handler.js";
import { formatBaselineListMarkdown, formatBaselineMarkdown } from "../utils/formatter.js";
import { formatToolResponse, paginatedOutput, textResponse } from "../utils/tool-helpers.js";

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
          return textResponse(webFeatureNotFoundError(params.feature));
        }

        return formatToolResponse(
          params.response_format,
          result as unknown as Record<string, unknown>,
          () => formatBaselineMarkdown(result)
        );
      } catch (error) {
        return textResponse(handleError(error));
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
          params.status === "false" ? false : (params.status as "high" | "low" | undefined);

        const results = listByBaseline(statusFilter, params.group, params.limit, params.offset);

        if (results.total === 0) {
          return textResponse("No features found matching the specified filters.");
        }

        const output = paginatedOutput(
          { features: results.features },
          results.features,
          results.total,
          params.offset,
          results.has_more
        );

        return formatToolResponse(params.response_format, output, () =>
          formatBaselineListMarkdown(results, params.status)
        );
      } catch (error) {
        return textResponse(handleError(error));
      }
    }
  );
}
