/**
 * Zod input schemas for all MCP tools
 */

import { z } from "zod";
import {
  BCD_CATEGORIES,
  DEFAULT_LIMIT,
  MAX_COMPARE_FEATURES,
  MAX_LIMIT,
  MAX_SEARCH_QUERY_LENGTH,
  MIN_COMPARE_FEATURES,
  MIN_SEARCH_QUERY_LENGTH,
  ResponseFormat,
} from "../constants.js";

/** Response format schema (shared) */
const responseFormatSchema = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for structured data");

/** Pagination schemas (shared) */
const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .default(DEFAULT_LIMIT)
  .describe("Maximum number of results to return (1-100, default: 20)");

const offsetSchema = z
  .number()
  .int()
  .min(0)
  .default(0)
  .describe("Number of results to skip for pagination (default: 0)");

/**
 * compat_check — Check browser compatibility for a specific feature
 */
export const CompatCheckInputSchema = z
  .object({
    feature: z
      .string()
      .min(1, "Feature identifier is required")
      .describe(
        'BCD feature identifier using dot notation (e.g., "api.PushManager", "css.properties.grid", "javascript.builtins.Array.at")'
      ),
    browsers: z
      .array(z.string())
      .optional()
      .describe(
        'Filter to specific browsers (e.g., ["chrome", "safari", "firefox"]). Omit for default desktop browsers.'
      ),
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatCheckInput = z.infer<typeof CompatCheckInputSchema>;

/**
 * compat_search — Search BCD features by keyword
 */
export const CompatSearchInputSchema = z
  .object({
    query: z
      .string()
      .min(MIN_SEARCH_QUERY_LENGTH, `Query must be at least ${MIN_SEARCH_QUERY_LENGTH} characters`)
      .max(MAX_SEARCH_QUERY_LENGTH, `Query must not exceed ${MAX_SEARCH_QUERY_LENGTH} characters`)
      .describe(
        'Search keyword to match against feature identifiers (e.g., "push", "grid", "service-worker")'
      ),
    category: z
      .enum(BCD_CATEGORIES)
      .optional()
      .describe('Filter by BCD category (e.g., "api", "css", "html", "javascript")'),
    limit: limitSchema,
    offset: offsetSchema,
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatSearchInput = z.infer<typeof CompatSearchInputSchema>;

/**
 * compat_get_baseline — Get Baseline status for a web feature
 */
export const CompatGetBaselineInputSchema = z
  .object({
    feature: z
      .string()
      .min(1, "Feature identifier is required")
      .describe(
        'web-features identifier using kebab-case (e.g., "container-queries", "push", "view-transitions")'
      ),
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatGetBaselineInput = z.infer<typeof CompatGetBaselineInputSchema>;

/**
 * compat_list_baseline — List features filtered by Baseline status
 */
export const CompatListBaselineInputSchema = z
  .object({
    status: z
      .enum(["high", "low", "false"])
      .optional()
      .describe(
        'Filter by Baseline status: "high" (Widely Available), "low" (Newly Available), "false" (Not Baseline)'
      ),
    group: z
      .string()
      .optional()
      .describe('Filter by web-features group (e.g., "css", "javascript", "forms")'),
    limit: limitSchema,
    offset: offsetSchema,
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatListBaselineInput = z.infer<typeof CompatListBaselineInputSchema>;

/**
 * compat_compare — Compare browser compatibility across multiple features
 */
export const CompatCompareInputSchema = z
  .object({
    features: z
      .array(z.string().min(1))
      .min(
        MIN_COMPARE_FEATURES,
        `At least ${MIN_COMPARE_FEATURES} features required for comparison`
      )
      .max(MAX_COMPARE_FEATURES, `Maximum ${MAX_COMPARE_FEATURES} features can be compared at once`)
      .describe(
        'Array of BCD feature identifiers to compare (e.g., ["api.fetch", "api.XMLHttpRequest"])'
      ),
    browsers: z
      .array(z.string())
      .optional()
      .describe(
        'Filter to specific browsers (e.g., ["chrome", "safari"]). Omit for default desktop browsers.'
      ),
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatCompareInput = z.infer<typeof CompatCompareInputSchema>;

/**
 * compat_list_browsers — List tracked browsers
 */
export const CompatListBrowsersInputSchema = z
  .object({
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatListBrowsersInput = z.infer<typeof CompatListBrowsersInputSchema>;

/**
 * compat_check_support — Find features supported in a specific browser version
 */
export const CompatCheckSupportInputSchema = z
  .object({
    browser: z
      .string()
      .min(1, "Browser name is required")
      .describe('Browser identifier (e.g., "safari", "chrome", "firefox")'),
    version: z
      .string()
      .min(1, "Version is required")
      .describe('Browser version (e.g., "17.0", "120", "121")'),
    category: z
      .enum(BCD_CATEGORIES)
      .optional()
      .describe('Filter by BCD category (e.g., "api", "css")'),
    limit: limitSchema,
    offset: offsetSchema,
    response_format: responseFormatSchema,
  })
  .strict();

export type CompatCheckSupportInput = z.infer<typeof CompatCheckSupportInputSchema>;
