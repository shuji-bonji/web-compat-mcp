/**
 * Input normalization utilities for BCD queries.
 *
 * BCD feature identifiers use camelCase (e.g., `PushManager`, `CSSViewTransitionRule`),
 * so user input with hyphens/underscores/spaces (e.g., `view-transition`) will not
 * match directly via substring search. Similarly, BCD version strings are typically
 * bare (e.g., `17`, not `17.0`), so trailing `.0` must be stripped to match.
 *
 * Each normalizer returns an ordered list of candidate values:
 *   - Index 0: the original (untouched) input
 *   - Index 1+: normalized variants to try as fallback
 *
 * Callers should try candidates in order and stop at the first non-empty result.
 */

/**
 * Generate candidate search queries.
 *
 * The stripped variant removes hyphens, underscores, and whitespace so that
 * kebab-case / snake_case input can match BCD's camelCase identifiers via
 * case-insensitive substring search.
 *
 * Examples:
 *   - "view-transition"   → ["view-transition", "viewtransition"]
 *   - "service_worker"    → ["service_worker", "serviceworker"]
 *   - "PushManager"       → ["PushManager"]   (no separators — no fallback)
 *   - "push manager"      → ["push manager", "pushmanager"]
 */
export function normalizeSearchQuery(query: string): string[] {
  const candidates: string[] = [query];
  const stripped = query.replace(/[-_\s]+/g, "");
  if (stripped !== query && stripped.length > 0) {
    candidates.push(stripped);
  }
  return candidates;
}

/**
 * Generate candidate browser versions.
 *
 * BCD records version_added as bare strings (e.g., "17", "120"), so a user
 * typing "17.0" won't match. This strips trailing ".0" (including ".0.0") and
 * offers the stripped form as a fallback.
 *
 * Examples:
 *   - "17.0"    → ["17.0", "17"]
 *   - "17.0.0"  → ["17.0.0", "17"]
 *   - "17.1"    → ["17.1"]   (no trailing .0 — no fallback)
 *   - "17.10"   → ["17.10"]  (".10" is not ".0")
 *   - "17"      → ["17"]
 */
export function normalizeBrowserVersion(version: string): string[] {
  const candidates: string[] = [version];
  // Strip trailing ".0" (repeated, e.g., "1.0.0" → "1")
  const stripped = version.replace(/(?:\.0+)+$/, "");
  if (stripped !== version && stripped.length > 0) {
    candidates.push(stripped);
  }
  return candidates;
}
