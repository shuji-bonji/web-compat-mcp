/**
 * Web Features Service
 *
 * Loads and queries the web-features package (W3C WebDX CG).
 * Provides Baseline status data.
 * All data is local (npm package) — no network requests.
 */

import { features, groups, browsers } from "web-features";
import type { BaselineFeatureResult } from "../types.js";

/** web-features feature type */
interface WebFeature {
  name: string;
  description?: string;
  description_html?: string;
  caniuse?: string[];
  compat_features?: string[];
  spec?: string | string[];
  group?: string;
  status?: {
    baseline?: "high" | "low" | false;
    baseline_low_date?: string;
    baseline_high_date?: string;
    support?: Record<string, string>;
  };
}

/**
 * Get Baseline status for a specific web feature
 */
export function getBaselineStatus(
  featureId: string
): BaselineFeatureResult | null {
  const feature = (features as Record<string, WebFeature>)[featureId];
  if (!feature) return null;

  const status = feature.status;

  return {
    id: featureId,
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
  const allFeatures = Object.entries(
    features as Record<string, WebFeature>
  );

  const filtered = allFeatures.filter(([_id, feature]) => {
    // Filter by baseline status
    if (statusFilter !== undefined) {
      const baseline = feature.status?.baseline ?? false;
      if (baseline !== statusFilter) return false;
    }

    // Filter by group
    if (groupFilter) {
      if (feature.group !== groupFilter) return false;
    }

    return true;
  });

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);

  const results: BaselineFeatureResult[] = sliced.map(([id, feature]) => {
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
  });

  return {
    total,
    features: results,
    has_more: total > offset + limit,
  };
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
  const allFeatures = Object.entries(
    features as Record<string, WebFeature>
  );

  const filtered = allFeatures.filter(
    ([id, feature]) =>
      id.toLowerCase().includes(lowerQuery) ||
      feature.name.toLowerCase().includes(lowerQuery) ||
      (feature.description?.toLowerCase().includes(lowerQuery) ?? false)
  );

  const total = filtered.length;
  const sliced = filtered.slice(offset, offset + limit);

  const results: BaselineFeatureResult[] = sliced.map(([id, feature]) => {
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
  });

  return {
    total,
    features: results,
    has_more: total > offset + limit,
  };
}

/**
 * Find web-features ID from a BCD feature ID (via compat_features mapping)
 */
export function findWebFeatureByBcdId(bcdId: string): string | null {
  for (const [id, feature] of Object.entries(
    features as Record<string, WebFeature>
  )) {
    if (feature.compat_features?.includes(bcdId)) {
      return id;
    }
  }
  return null;
}

/**
 * Get available groups
 */
export function getGroups(): Array<{ id: string; name: string }> {
  return Object.entries(groups as Record<string, { name: string }>).map(
    ([id, group]) => ({
      id,
      name: group.name,
    })
  );
}
