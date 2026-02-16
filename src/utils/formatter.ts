/**
 * Formatter utilities for Markdown and JSON output
 */

import { CHARACTER_LIMIT } from "../constants.js";
import type {
  FeatureCompatResult,
  SearchResultItem,
  BaselineFeatureResult,
  BrowserInfo,
} from "../types.js";

/** Baseline status emoji */
function baselineEmoji(status: "high" | "low" | false): string {
  switch (status) {
    case "high":
      return "✅ Widely Available";
    case "low":
      return "🟡 Newly Available";
    default:
      return "❌ Not Baseline";
  }
}

/** Format version string for display */
function formatVersion(
  versionAdded: string | boolean | null | undefined
): string {
  if (versionAdded === true) return "Yes";
  if (versionAdded === false || versionAdded === null || versionAdded === undefined)
    return "❌ No";
  return `${versionAdded}+`;
}

/**
 * Format compat_check result as Markdown
 */
export function formatCompatCheckMarkdown(
  result: FeatureCompatResult
): string {
  const lines: string[] = [];

  lines.push(`# ${result.id}`);
  lines.push("");

  // Status badges
  const statusParts: string[] = [];
  if (result.status?.standard_track) statusParts.push("Standard Track");
  if (result.status?.experimental) statusParts.push("⚠️ Experimental");
  if (result.status?.deprecated) statusParts.push("⛔ Deprecated");
  if (statusParts.length > 0) {
    lines.push(`**Status**: ${statusParts.join(" | ")}`);
  }

  // Baseline
  if (result.baseline) {
    lines.push(
      `**Baseline**: ${baselineEmoji(result.baseline.status)}${
        result.baseline.low_date ? ` (${result.baseline.low_date}~)` : ""
      }`
    );
  }
  lines.push("");

  // Browser Support table
  lines.push("## Browser Support");
  lines.push("");
  lines.push("| Browser | Version | Notes |");
  lines.push("|---------|---------|-------|");

  for (const [browserId, data] of Object.entries(result.support)) {
    const version = formatVersion(data.version_added);
    const notes: string[] = [];
    if (data.partial_implementation) notes.push("Partial");
    if (data.flags) notes.push("Flag required");
    if (data.prefix) notes.push(`Prefix: ${data.prefix}`);
    if (data.version_removed)
      notes.push(`Removed in ${data.version_removed}`);
    lines.push(
      `| ${browserId} | ${version} | ${notes.join(", ")} |`
    );
  }
  lines.push("");

  // Links
  if (result.mdn_url) {
    lines.push(`📖 [MDN](${result.mdn_url})`);
  }
  if (result.spec_url) {
    const specUrl = Array.isArray(result.spec_url)
      ? result.spec_url[0]
      : result.spec_url;
    lines.push(`📋 [Spec](${specUrl})`);
  }

  return lines.join("\n");
}

/**
 * Format search results as Markdown
 */
export function formatSearchMarkdown(
  results: { total: number; features: SearchResultItem[]; has_more: boolean },
  query: string
): string {
  const lines: string[] = [];

  lines.push(`# Search Results: "${query}"`);
  lines.push("");
  lines.push(`Found **${results.total}** features (showing ${results.features.length})`);
  lines.push("");

  lines.push("| Feature ID | Standard | Experimental | Deprecated |");
  lines.push("|------------|----------|--------------|------------|");

  for (const feature of results.features) {
    lines.push(
      `| \`${feature.id}\` | ${feature.standard_track ? "✅" : "❌"} | ${
        feature.experimental ? "⚠️" : "—"
      } | ${feature.deprecated ? "⛔" : "—"} |`
    );
  }

  if (results.has_more) {
    lines.push("");
    lines.push(
      `> ${results.total - results.features.length} more results available. Use \`offset\` parameter to paginate.`
    );
  }

  return lines.join("\n");
}

/**
 * Format baseline result as Markdown
 */
export function formatBaselineMarkdown(
  result: BaselineFeatureResult
): string {
  const lines: string[] = [];

  lines.push(`# ${result.name}`);
  lines.push("");
  lines.push(`**ID**: \`${result.id}\``);
  lines.push(`**Baseline**: ${baselineEmoji(result.baseline.status)}`);
  if (result.baseline.low_date)
    lines.push(`**Newly Available since**: ${result.baseline.low_date}`);
  if (result.baseline.high_date)
    lines.push(`**Widely Available since**: ${result.baseline.high_date}`);
  lines.push("");

  if (result.description) {
    lines.push(result.description);
    lines.push("");
  }

  // Browser support
  lines.push("## Browser Support");
  lines.push("");
  lines.push("| Browser | Version |");
  lines.push("|---------|---------|");
  for (const [browser, version] of Object.entries(result.browser_support)) {
    lines.push(`| ${browser} | ${version}+ |`);
  }
  lines.push("");

  // Related BCD features
  if (result.compat_features.length > 0) {
    lines.push("## Related BCD Features");
    lines.push("");
    const maxShow = 10;
    const shown = result.compat_features.slice(0, maxShow);
    for (const f of shown) {
      lines.push(`- \`${f}\``);
    }
    if (result.compat_features.length > maxShow) {
      lines.push(
        `- ... and ${result.compat_features.length - maxShow} more`
      );
    }
    lines.push("");
  }

  // Links
  if (result.spec) {
    lines.push(`📋 [Spec](${result.spec})`);
  }

  return lines.join("\n");
}

/**
 * Format baseline list as Markdown
 */
export function formatBaselineListMarkdown(
  results: { total: number; features: BaselineFeatureResult[]; has_more: boolean },
  statusFilter?: string
): string {
  const lines: string[] = [];

  const title = statusFilter
    ? `Baseline Features (${statusFilter})`
    : "Baseline Features";
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(
    `Found **${results.total}** features (showing ${results.features.length})`
  );
  lines.push("");

  lines.push("| Feature | Baseline | Since |");
  lines.push("|---------|----------|-------|");

  for (const feature of results.features) {
    const since = feature.baseline.low_date ?? "—";
    lines.push(
      `| ${feature.name} (\`${feature.id}\`) | ${baselineEmoji(
        feature.baseline.status
      )} | ${since} |`
    );
  }

  if (results.has_more) {
    lines.push("");
    lines.push(
      `> ${results.total - results.features.length} more results available. Use \`offset\` parameter to paginate.`
    );
  }

  return lines.join("\n");
}

/**
 * Truncate response if needed
 */
export function truncateIfNeeded(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const truncated = text.substring(0, CHARACTER_LIMIT);
  return (
    truncated +
    "\n\n---\n> ⚠️ Response truncated. Use `limit` or `offset` parameters to narrow results."
  );
}
