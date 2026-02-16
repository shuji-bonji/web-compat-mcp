/**
 * BCD Compatibility tools — compat_check, compat_compare
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CompatCheckInputSchema,
  CompatCompareInputSchema,
  type CompatCheckInput,
  type CompatCompareInput,
} from "../schemas/input-schemas.js";
import { ResponseFormat } from "../constants.js";
import { getFeatureCompat } from "../services/bcd-service.js";
import { findWebFeatureByBcdId, getBaselineStatus } from "../services/features-service.js";
import {
  formatCompatCheckMarkdown,
  formatCompareMarkdown,
  truncateIfNeeded,
} from "../utils/formatter.js";
import { featureNotFoundError, handleError } from "../utils/error-handler.js";
import type { FeatureCompatResult } from "../types.js";

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

  // compat_compare — Compare browser compatibility across multiple features
  server.registerTool(
    "compat_compare",
    {
      title: "Compare Browser Compatibility",
      description: `Compare browser compatibility across multiple web platform features side by side.

Useful for choosing between alternative APIs or understanding support differences.

Args:
  - features (string[]): 2-5 BCD feature identifiers to compare (e.g., ["api.fetch", "api.XMLHttpRequest"])
  - browsers (string[], optional): Filter to specific browsers. Omit for default desktop browsers.
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Side-by-side comparison table showing version support for each feature across browsers.

Examples:
  - Compare fetch vs XMLHttpRequest → features: ["api.fetch", "api.XMLHttpRequest"]
  - Compare CSS layout methods → features: ["css.properties.grid", "css.properties.flex"]
  - Compare storage APIs → features: ["api.localStorage", "api.sessionStorage", "api.IndexedDB"]`,
      inputSchema: CompatCompareInputSchema.shape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: CompatCompareInput) => {
      try {
        const results: FeatureCompatResult[] = [];
        const notFound: string[] = [];

        for (const featureId of params.features) {
          const result = getFeatureCompat(featureId, params.browsers);
          if (result) {
            // Enrich with Baseline
            const webFeatureId = findWebFeatureByBcdId(featureId);
            if (webFeatureId) {
              const baselineData = getBaselineStatus(webFeatureId);
              if (baselineData) {
                result.baseline = baselineData.baseline;
              }
            }
            results.push(result);
          } else {
            notFound.push(featureId);
          }
        }

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `None of the specified features were found: ${notFound.join(", ")}`,
              },
            ],
          };
        }

        const output = {
          features: results,
          not_found: notFound.length > 0 ? notFound : undefined,
        };

        if (params.response_format === ResponseFormat.JSON) {
          const text = JSON.stringify(output, null, 2);
          return {
            content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
            structuredContent: output,
          };
        }

        const markdown = formatCompareMarkdown(results, notFound);
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
