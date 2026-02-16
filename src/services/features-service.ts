/**
 * Web Features Service
 *
 * Loads and queries the web-features package (W3C WebDX CG).
 * Provides Baseline status data.
 * All data is local (npm package) — no network requests.
 */

import { features, groups } from "web-features";
import type { BaselineFeatureResult, WebFeature } from "../types.js";

/** Typed reference to web-features data */
const featuresData = features as Record<string, WebFeature>;

/**
 * Lazy-initialized reverse index: BCD feature ID → web-features ID
 * Avoids O(n) linear scan on every findWebFeatureByBcdId call.
 */
let bcdToWebFeatureIndex: Map<string, string> | null = null;

function getBcdToWebFeatureIndex(): Map<string, string> {
  if (bcdToWebFeatureIndex) return bcdToWebFeatureIndex;

  bcdToWebFeatureIndex = new Map();
  for (const [id, feature] of Object.entries(featuresData)) {
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
    spec: Array.isArray(feature.spec) ? feature.spec[0] : feature.spec,
    group: feature.group,
    caniuse: feature.caniuse,
  };
}

/**
 * Get Baseline status for a specific web feature
 */
export function getBaselineStatus(featureId: string): BaselineFeatureResult | null {
  const feature = featuresData[featureId];
  if (!feature) return null;
  return toBaselineFeatureResult(featureId, feature);
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
  const allFeatures = Object.entries(featuresData);

  const filtered = allFeatures.filter(([_id, feature]) => {
    if (statusFilter !== undefined) {
      const baseline = feature.status?.baseline ?? false;
      if (baseline !== statusFilter) return false;
    }
    if (groupFilter) {
      if (feature.group !== groupFilter) return false;
    }
    return true;
  });

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);
  const results = sliced.map(([id, feature]) => toBaselineFeatureResult(id, feature));

  return { total, features: results, has_more: total > offset + limit };
}

/**
 * Search web-features by keyword (matches against id and name)
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
  const allFeatures = Object.entries(featuresData);

  const filtered = allFeatures.filter(
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
