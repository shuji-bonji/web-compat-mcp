/**
 * BCD (Browser Compat Data) Service
 *
 * Loads and queries @mdn/browser-compat-data.
 * All data is local (npm package) — no network requests.
 */

import bcd from "@mdn/browser-compat-data" with { type: "json" };
import { BCD_CATEGORIES, DESKTOP_BROWSERS } from "../constants.js";
import type {
  BcdCompatData,
  BcdSupportStatement,
  BrowserInfo,
  FeatureCompatResult,
  SearchResultItem,
} from "../types.js";

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
    // Return the most relevant (first without flags, or just first)
    return statement.find((s) => !s.flags) ?? statement[0] ?? null;
  }
  return statement;
}

/**
 * Extract the web-features tag from BCD tags
 */
function extractWebFeaturesTag(tags?: string[]): string | null {
  if (!tags) return null;
  const tag = tags.find((t) => t.startsWith("web-features:"));
  return tag ? tag.replace("web-features:", "") : null;
}

/**
 * Get compatibility data for a specific BCD feature
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

  const webFeatureId = extractWebFeaturesTag(compat.tags);

  return {
    id: featureId,
    description: compat.mdn_url ? `See MDN: ${compat.mdn_url}` : undefined,
    mdn_url: compat.mdn_url,
    spec_url: compat.spec_url,
    status: compat.status,
    support,
    baseline: webFeatureId ? { status: false, low_date: null, high_date: null } : null,
  };
}

/**
 * Recursively collect all feature paths under a BCD category
 */
function collectFeaturePaths(
  node: BcdNode,
  prefix: string,
  results: string[],
  maxDepth: number = 4,
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

  const allPaths: string[] = [];

  for (const cat of categories) {
    const catData = (bcd as unknown as BcdNode)[cat];
    if (!isBcdNode(catData)) continue;
    collectFeaturePaths(catData, cat, allPaths);
  }

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

/**
 * Get browser information from BCD
 */
export function getBrowsers(): BrowserInfo[] {
  const result: BrowserInfo[] = [];
  const browsersData = bcd.browsers;

  for (const [id, browser] of Object.entries(browsersData)) {
    const releases = browser.releases;
    // Find the latest current release
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

  const allPaths: string[] = [];
  for (const cat of categories) {
    const catData = (bcd as unknown as BcdNode)[cat];
    if (!isBcdNode(catData)) continue;
    collectFeaturePaths(catData, cat, allPaths, 4);
  }

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
