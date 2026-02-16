/**
 * BCD (Browser Compat Data) Service
 *
 * Loads and queries @mdn/browser-compat-data.
 * All data is local (npm package) — no network requests.
 */

import bcd from "@mdn/browser-compat-data" with { type: "json" };
import { BCD_CATEGORIES, BCD_MAX_TRAVERSE_DEPTH, DESKTOP_BROWSERS } from "../constants.js";
import type {
  BcdCompatData,
  BcdSupportStatement,
  BrowserInfo,
  FeatureCompatResult,
  SearchResultItem,
} from "../types.js";
import { findWebFeatureByBcdId, getBaselineStatus } from "./features-service.js";

type BcdCategory = (typeof BCD_CATEGORIES)[number];

/** Recursive BCD tree node type — avoids `any` */
type BcdNode = Record<string, unknown>;

/** Type guard: check if value is a traversable BCD node */
function isBcdNode(value: unknown): value is BcdNode {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Navigate the BCD tree by dot-separated path
 * e.g., "api.PushManager" → bcd.api.PushManager
 */
function getFeatureByPath(path: string): { __compat?: BcdCompatData } | null {
  const parts = path.split(".");
  let current: unknown = bcd;

  for (const part of parts) {
    if (!isBcdNode(current)) return null;
    current = current[part];
  }

  return isBcdNode(current) ? (current as { __compat?: BcdCompatData }) : null;
}

/**
 * Normalize BCD support statement to a single object
 * (BCD can return an array of statements for a single browser)
 */
function normalizeSupportStatement(
  statement: BcdSupportStatement | BcdSupportStatement[] | undefined
): BcdSupportStatement | null {
  if (!statement) return null;
  if (Array.isArray(statement)) {
    return statement.find((s) => !s.flags) ?? statement[0] ?? null;
  }
  return statement;
}

/**
 * Get compatibility data for a specific BCD feature.
 * Baseline data is resolved internally via web-features cross-reference.
 */
export function getFeatureCompat(
  featureId: string,
  browserFilter?: string[]
): FeatureCompatResult | null {
  const node = getFeatureByPath(featureId);
  if (!node?.__compat) return null;

  const compat = node.__compat;
  const browsers = browserFilter ?? [...DESKTOP_BROWSERS];

  const support: FeatureCompatResult["support"] = {};
  for (const browserId of browsers) {
    const stmt = normalizeSupportStatement(
      compat.support[browserId] as BcdSupportStatement | BcdSupportStatement[]
    );
    if (stmt) {
      support[browserId] = {
        version_added: stmt.version_added,
        version_removed: stmt.version_removed,
        flags: stmt.flags ? true : undefined,
        partial_implementation: stmt.partial_implementation,
        prefix: stmt.prefix,
        notes: Array.isArray(stmt.notes) ? stmt.notes.join("; ") : stmt.notes,
      };
    }
  }

  // Resolve Baseline data from web-features (fix: was returning placeholder)
  let baseline: FeatureCompatResult["baseline"] = null;
  const webFeatureId = findWebFeatureByBcdId(featureId);
  if (webFeatureId) {
    const baselineData = getBaselineStatus(webFeatureId);
    if (baselineData) {
      baseline = baselineData.baseline;
    }
  }

  return {
    id: featureId,
    description: compat.status?.deprecated
      ? "⛔ Deprecated"
      : compat.status?.experimental
        ? "⚠️ Experimental"
        : undefined,
    mdn_url: compat.mdn_url,
    spec_url: compat.spec_url,
    status: compat.status,
    support,
    baseline,
  };
}

// ──────────────────────────────────────────────────────────────
// Feature path index (lazy-initialized cache for 5-1)
// ──────────────────────────────────────────────────────────────

/** Cached feature paths per category */
let featurePathIndex: Map<string, string[]> | null = null;

/**
 * Get or build the lazy-initialized feature path index.
 * Avoids re-traversing the entire BCD tree (15K+ features) on every call.
 */
function getFeaturePathIndex(): Map<string, string[]> {
  if (featurePathIndex) return featurePathIndex;

  featurePathIndex = new Map();
  for (const cat of BCD_CATEGORIES) {
    const catData = (bcd as unknown as BcdNode)[cat];
    if (!isBcdNode(catData)) continue;
    const paths: string[] = [];
    collectFeaturePaths(catData, cat, paths, BCD_MAX_TRAVERSE_DEPTH);
    featurePathIndex.set(cat, paths);
  }
  return featurePathIndex;
}

/**
 * Get all feature paths for specified categories (from cache)
 */
function getPathsForCategories(categories: readonly string[]): string[] {
  const index = getFeaturePathIndex();
  const allPaths: string[] = [];
  for (const cat of categories) {
    const paths = index.get(cat);
    if (paths) allPaths.push(...paths);
  }
  return allPaths;
}

/**
 * Recursively collect all feature paths under a BCD category
 */
function collectFeaturePaths(
  node: BcdNode,
  prefix: string,
  results: string[],
  maxDepth: number = BCD_MAX_TRAVERSE_DEPTH,
  currentDepth: number = 0
): void {
  if (currentDepth > maxDepth) return;

  for (const key of Object.keys(node)) {
    if (key === "__compat" || key === "__meta") continue;
    const child = node[key];
    if (isBcdNode(child)) {
      if ("__compat" in child) {
        results.push(`${prefix}.${key}`);
      }
      // Always recurse into sub-features (intermediate nodes like css.properties may lack __compat)
      collectFeaturePaths(child, `${prefix}.${key}`, results, maxDepth, currentDepth + 1);
    }
  }
}

/**
 * Search BCD features by keyword
 */
export function searchFeatures(
  query: string,
  category?: string,
  limit: number = 20,
  offset: number = 0
): { total: number; features: SearchResultItem[]; has_more: boolean } {
  const lowerQuery = query.toLowerCase();
  const categories = category ? [category as BcdCategory] : [...BCD_CATEGORIES];

  const allPaths = getPathsForCategories(categories);

  // Filter by query (match against path)
  const matches = allPaths.filter((path) => path.toLowerCase().includes(lowerQuery));

  const total = matches.length;
  const sliced = matches.slice(offset, offset + limit);

  const features: SearchResultItem[] = sliced.map((id) => {
    const node = getFeatureByPath(id);
    const compat = node?.__compat;
    return {
      id,
      description: compat?.mdn_url ? `MDN: ${compat.mdn_url}` : undefined,
      deprecated: compat?.status?.deprecated ?? false,
      experimental: compat?.status?.experimental ?? false,
      standard_track: compat?.status?.standard_track ?? false,
    };
  });

  return {
    total,
    features,
    has_more: total > offset + limit,
  };
}

// ──────────────────────────────────────────────────────────────
// Browser data (cached — immutable data)
// ──────────────────────────────────────────────────────────────

/** Cached browser info list */
let browsersCache: BrowserInfo[] | null = null;

/**
 * Get browser information from BCD (cached)
 */
export function getBrowsers(): BrowserInfo[] {
  if (browsersCache) return browsersCache;

  const result: BrowserInfo[] = [];
  const browsersData = bcd.browsers;

  for (const [id, browser] of Object.entries(browsersData)) {
    const releases = browser.releases;
    let currentVersion: string | undefined;
    let releaseDate: string | undefined;

    for (const [version, release] of Object.entries(releases)) {
      if (release.status === "current") {
        currentVersion = version;
        releaseDate = release.release_date;
        break;
      }
    }

    result.push({
      id,
      name: browser.name,
      type: browser.type,
      current_version: currentVersion,
      release_date: releaseDate,
    });
  }

  browsersCache = result;
  return result;
}

/**
 * Get all available BCD categories
 */
export function getCategories(): string[] {
  return [...BCD_CATEGORIES];
}

/**
 * Find features added in a specific browser version.
 * Returns features where version_added matches the given version.
 */
export function findFeaturesByBrowserVersion(
  browser: string,
  version: string,
  category?: string,
  limit: number = 20,
  offset: number = 0
): {
  total: number;
  features: Array<{ id: string; version_added: string }>;
  has_more: boolean;
} {
  const categories = category ? [category as BcdCategory] : [...BCD_CATEGORIES];

  const allPaths = getPathsForCategories(categories);

  // Filter features where the browser's version_added matches
  const matches: Array<{ id: string; version_added: string }> = [];

  for (const path of allPaths) {
    const node = getFeatureByPath(path);
    if (!node?.__compat) continue;

    const stmt = normalizeSupportStatement(
      node.__compat.support[browser] as BcdSupportStatement | BcdSupportStatement[]
    );
    if (!stmt) continue;

    const va = stmt.version_added;
    if (typeof va === "string" && va === version) {
      matches.push({ id: path, version_added: va });
    }
  }

  const total = matches.length;
  const sliced = matches.slice(offset, offset + limit);

  return {
    total,
    features: sliced,
    has_more: total > offset + limit,
  };
}
