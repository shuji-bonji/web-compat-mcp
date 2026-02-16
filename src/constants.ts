/**
 * Shared constants for web-compat-mcp server
 */

/** Maximum response size in characters */
export const CHARACTER_LIMIT = 25000;

/** Default pagination limit */
export const DEFAULT_LIMIT = 20;

/** Maximum pagination limit */
export const MAX_LIMIT = 100;

/** BCD top-level categories */
export const BCD_CATEGORIES = [
  "api",
  "css",
  "html",
  "http",
  "javascript",
  "mathml",
  "svg",
  "webassembly",
  "webdriver",
  "webextensions",
  "manifests",
] as const;

export type BcdCategory = (typeof BCD_CATEGORIES)[number];

/** Response format options */
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

/** Core browsers tracked for Baseline */
export const BASELINE_BROWSERS = [
  "chrome",
  "chrome_android",
  "edge",
  "firefox",
  "firefox_android",
  "safari",
  "safari_ios",
] as const;

/** Desktop browsers for simplified display */
export const DESKTOP_BROWSERS = [
  "chrome",
  "edge",
  "firefox",
  "safari",
] as const;
