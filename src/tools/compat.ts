/**
 * BCD Compatibility tools — compat_check, compat_compare
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type CompatCheckInput,
  CompatCheckInputSchema,
  type CompatCompareInput,
  CompatCompareInputSchema,
} from "../schemas/input-schemas.js";
import { getFeatureCompat } from "../services/bcd-service.js";
import type { FeatureCompatResult } from "../types.js";
import { featureNotFoundError, handleError } from "../utils/error-handler.js";
import { formatCompareMarkdown, formatCompatCheckMarkdown } from "../utils/formatter.js";
import { formatToolResponse, textResponse } from "../utils/tool-helpers.js";

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
          return textResponse(featureNotFoundError(params.feature));
        }

        // Baseline data is now resolved internally by getFeatureCompat

        return formatToolResponse(
          params.response_format,
          result as unknown as Record<string, unknown>,
          () => formatCompatCheckMarkdown(result)
        );
      } catch (error) {
        return textResponse(handleError(error));
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
          // Baseline data is resolved internally by getFeatureCompat
          const result = getFeatureCompat(featureId, params.browsers);
          if (result) {
            results.push(result);
          } else {
            notFound.push(featureId);
          }
        }

        if (results.length === 0) {
          return textResponse(`None of the specified features were found: ${notFound.join(", ")}`);
        }

        const output = {
          features: results,
          not_found: notFound.length > 0 ? notFound : undefined,
        };

        return formatToolResponse(
          params.response_format,
          output as unknown as Record<string, unknown>,
          () => formatCompareMarkdown(results, notFound)
        );
      } catch (error) {
        return textResponse(handleError(error));
      }
    }
  );
}
