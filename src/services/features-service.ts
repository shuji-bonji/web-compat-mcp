/**
 * Web Features Service
 *
 * Loads and queries the web-features package (W3C WebDX CG).
 * Provides Baseline status data.
 * All data is local (npm package) — no network requests.
 *
 * web-features 3.x ships three kinds of entries under `features`:
 *   - `kind: "feature"` — a regular feature (name, status, compat_features, …)
 *   - `kind: "moved"`   — the ID was renamed; `redirect_target` names the new ID
 *   - `kind: "split"`   — the ID was split; `redirect_targets` names the new IDs
 * Only `kind: "feature"` entries carry `name` / `status`, so every listing and
 * search below is restricted to them. Redirect entries are resolved by
 * {@link resolveFeatureRedirect}.
 */

import { features, groups } from "web-features";
import type {
  BaselineFeatureResult,
  WebFeature,
  WebFeatureEntry,
  WebFeatureRedirect,
} from "../types.js";

/** Typed reference to web-features data (all kinds) */
const allEntries = features as Record<string, WebFeatureEntry>;

function isFeature(entry: WebFeatureEntry | undefined): entry is WebFeature {
  return entry !== undefined && entry.kind === "feature";
}

/** `[id, feature]` pairs for `kind: "feature"` entries only, computed once */
const featureEntries: Array<[string, WebFeature]> = Object.entries(allEntries).filter(
  (pair): pair is [string, WebFeature] => isFeature(pair[1])
);

/** web-features 2.x stored `group` as a string, 3.x as a non-empty array */
function groupsOf(feature: WebFeature): string[] {
  if (feature.group === undefined) return [];
  return Array.isArray(feature.group) ? feature.group : [feature.group];
}

function firstOf(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function listOf(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

/**
 * Lazy-initialized reverse index: BCD feature ID → web-features ID
 * Avoids O(n) linear scan on every findWebFeatureByBcdId call.
 */
let bcdToWebFeatureIndex: Map<string, string> | null = null;

function getBcdToWebFeatureIndex(): Map<string, string> {
  if (bcdToWebFeatureIndex) return bcdToWebFeatureIndex;

  bcdToWebFeatureIndex = new Map();
  for (const [id, feature] of featureEntries) {
    if (feature.compat_features) {
      for (const bcdId of feature.compat_features) {
        bcdToWebFeatureIndex.set(bcdId, id);
      }
    }
  }
  return bcdToWebFeatureIndex;
}

/**
 * Convert a web-features entry to BaselineFeatureResult
 * (Eliminates 3x duplication across getBaselineStatus, listByBaseline, searchWebFeatures)
 */
function toBaselineFeatureResult(id: string, feature: WebFeature): BaselineFeatureResult {
  const status = feature.status;
  const featureGroups = groupsOf(feature);
  return {
    id,
    name: feature.name,
    description: feature.description,
    baseline: {
      status: status?.baseline ?? false,
      low_date: status?.baseline_low_date ?? null,
      high_date: status?.baseline_high_date ?? null,
    },
    browser_support: status?.support ?? {},
    compat_features: feature.compat_features ?? [],
    spec: firstOf(feature.spec),
    group: featureGroups[0],
    groups: featureGroups,
    caniuse: listOf(feature.caniuse),
    ...(feature.discouraged ? { discouraged: feature.discouraged } : {}),
  };
}

/**
 * Resolve a `moved` / `split` redirect entry. Returns null when the ID is a
 * regular feature or does not exist at all.
 */
export function resolveFeatureRedirect(featureId: string): WebFeatureRedirect | null {
  const entry = allEntries[featureId];
  if (!entry || entry.kind === "feature") return null;
  return entry;
}

/**
 * Get Baseline status for a specific web feature.
 *
 * A `moved` ID is followed to its target and the result carries
 * `redirected_from`. A `split` ID has no single answer and returns null —
 * use {@link resolveFeatureRedirect} to list its targets.
 */
export function getBaselineStatus(featureId: string): BaselineFeatureResult | null {
  const entry = allEntries[featureId];
  if (!entry) return null;

  if (entry.kind === "moved") {
    const target = allEntries[entry.redirect_target];
    if (!isFeature(target)) return null;
    return {
      ...toBaselineFeatureResult(entry.redirect_target, target),
      redirected_from: featureId,
    };
  }
  if (entry.kind === "split") return null;

  return toBaselineFeatureResult(featureId, entry);
}

/**
 * List features filtered by Baseline status
 */
export function listByBaseline(
  statusFilter?: "high" | "low" | false,
  groupFilter?: string,
  limit: number = 20,
  offset: number = 0
): {
  total: number;
  features: BaselineFeatureResult[];
  has_more: boolean;
} {
  const filtered = featureEntries.filter(([_id, feature]) => {
    if (statusFilter !== undefined) {
      const baseline = feature.status?.baseline ?? false;
      if (baseline !== statusFilter) return false;
    }
    if (groupFilter) {
      if (!groupsOf(feature).includes(groupFilter)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);
  const results = sliced.map(([id, feature]) => toBaselineFeatureResult(id, feature));

  return { total, features: results, has_more: total > offset + limit };
}

/**
 * Search web-features by keyword (matches against id, name and description)
 */
export function searchWebFeatures(
  query: string,
  limit: number = 20,
  offset: number = 0
): {
  total: number;
  features: BaselineFeatureResult[];
  has_more: boolean;
} {
  const lowerQuery = query.toLowerCase();

  const filtered = featureEntries.filter(
    ([id, feature]) =>
      id.toLowerCase().includes(lowerQuery) ||
      feature.name.toLowerCase().includes(lowerQuery) ||
      (feature.description?.toLowerCase().includes(lowerQuery) ?? false)
  );

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);
  const results = sliced.map(([id, feature]) => toBaselineFeatureResult(id, feature));

  return { total, features: results, has_more: total > offset + limit };
}

/**
 * Find web-features ID from a BCD feature ID (via compat_features mapping)
 * Uses lazy-initialized reverse index for O(1) lookup.
 */
export function findWebFeatureByBcdId(bcdId: string): string | null {
  return getBcdToWebFeatureIndex().get(bcdId) ?? null;
}

/**
 * Get available groups
 */
export function getGroups(): Array<{ id: string; name: string }> {
  return Object.entries(groups as Record<string, { name: string }>).map(([id, group]) => ({
    id,
    name: group.name,
  }));
}
