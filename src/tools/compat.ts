/**
 * BCD Compatibility tools — compat_check, compat_compare
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CompatCheckInputSchema,
  type CompatCheckInput,
} from "../schemas/input-schemas.js";
import { ResponseFormat } from "../constants.js";
import { getFeatureCompat } from "../services/bcd-service.js";
import { findWebFeatureByBcdId, getBaselineStatus } from "../services/features-service.js";
import { formatCompatCheckMarkdown, truncateIfNeeded } from "../utils/formatter.js";
import { featureNotFoundError, handleError } from "../utils/error-handler.js";

export function registerCompatTools(server: McpServer): void {
  server.registerTool(
    "compat_check",
    {
      title: "Check Browser Compatibility",
      description: `Check browser compatibility for a specific web platform feature using MDN Browser Compat Data (BCD).

Returns version support across browsers, Baseline status, and links to MDN/spec documentation.

Args:
  - feature (string): BCD identifier in dot notation (e.g., "api.PushManager", "css.properties.grid", "javascript.builtins.Promise")
  - browsers (string[], optional): Filter to specific browsers (e.g., ["chrome", "safari"]). Defaults to desktop browsers.
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Browser support versions, Baseline status, standard/experimental/deprecated flags, and MDN/spec links.

Examples:
  - "Is Push API supported in Safari?" → feature: "api.PushManager"
  - "Can I use CSS grid?" → feature: "css.properties.grid"
  - "Is Array.at() widely available?" → feature: "javascript.builtins.Array.at"`,
      inputSchema: CompatCheckInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatCheckInput) => {
      try {
        const result = getFeatureCompat(params.feature, params.browsers);

        if (!result) {
          return {
            content: [{ type: "text" as const, text: featureNotFoundError(params.feature) }],
          };
        }

        // Enrich with Baseline data via web-features cross-reference
        const webFeatureId = findWebFeatureByBcdId(params.feature);
        if (webFeatureId) {
          const baselineData = getBaselineStatus(webFeatureId);
          if (baselineData) {
            result.baseline = baselineData.baseline;
          }
        }

        if (params.response_format === ResponseFormat.JSON) {
          const text = JSON.stringify(result, null, 2);
          return {
            content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
            structuredContent: result,
          };
        }

        const markdown = formatCompatCheckMarkdown(result);
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
