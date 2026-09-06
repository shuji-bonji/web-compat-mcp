/**
 * Type definitions for web-compat-mcp server
 */

/** BCD support statement for a single browser */
export interface BcdSupportStatement {
  version_added: string | boolean | null;
  version_removed?: string | boolean | null;
  prefix?: string;
  alternative_name?: string;
  flags?: Array<{
    type: string;
    name: string;
    value_to_set?: string;
  }>;
  partial_implementation?: boolean;
  notes?: string | string[];
}

/** BCD compat data for a single feature */
export interface BcdCompatData {
  mdn_url?: string;
  source_file?: string;
  spec_url?: string | string[];
  tags?: string[];
  status?: {
    experimental: boolean;
    standard_track: boolean;
    deprecated: boolean;
  };
  support: Record<string, BcdSupportStatement | BcdSupportStatement[]>;
}

/** BCD feature node (can have nested sub-features) */
export interface BcdFeatureNode {
  __compat?: BcdCompatData;
  [key: string]: BcdFeatureNode | BcdCompatData | undefined;
}

/** Processed feature result for tool output */
export interface FeatureCompatResult {
  id: string;
  description?: string;
  mdn_url?: string;
  spec_url?: string | string[];
  status?: {
    experimental: boolean;
    standard_track: boolean;
    deprecated: boolean;
  };
  support: Record<
    string,
    {
      version_added: string | boolean | null;
      version_removed?: string | boolean | null;
      flags?: boolean;
      partial_implementation?: boolean;
      prefix?: string;
      notes?: string;
    }
  >;
  baseline?: {
    status: "high" | "low" | false;
    low_date?: string | null;
    high_date?: string | null;
  } | null;
}

/** Search result item */
export interface SearchResultItem {
  id: string;
  description?: string;
  deprecated: boolean;
  experimental: boolean;
  standard_track: boolean;
}

/** Baseline feature result */
export interface BaselineFeatureResult {
  id: string;
  name: string;
  description?: string;
  baseline: {
    status: "high" | "low" | false;
    low_date?: string | null;
    high_date?: string | null;
  };
  browser_support: Record<string, string>;
  compat_features: string[];
  spec?: string;
  /** First group (kept for backward compatibility); see `groups` for all */
  group?: string;
  /** All groups the feature belongs to (web-features 3.x allows several) */
  groups: string[];
  caniuse?: string[];
  /** Present when web-features marks the feature as discouraged (e.g. Annex B, intent-to-unship) */
  discouraged?: {
    according_to: string[];
    alternatives?: string[];
    reason?: string;
  };
  /** Set when the requested ID was a `moved` redirect and this result belongs to its target */
  redirected_from?: string;
}

/** Browser info */
export interface BrowserInfo {
  id: string;
  name: string;
  type: string;
  current_version?: string;
  release_date?: string;
}

/** web-features feature type (from web-features package) */
/**
 * A regular web-features entry (`kind: "feature"`).
 * web-features 3.x also ships `kind: "moved"` / `kind: "split"` redirect entries
 * (no name/status); see {@link WebFeatureRedirect}.
 */
export interface WebFeature {
  kind: "feature";
  name: string;
  description?: string;
  description_html?: string;
  caniuse?: string | string[];
  compat_features?: string[];
  spec?: string | string[];
  /** web-features 3.x stores groups as a non-empty array; 2.x used a string */
  group?: string | string[];
  discouraged?: {
    according_to: string[];
    alternatives?: string[];
    reason?: string;
  };
  status?: {
    baseline?: "high" | "low" | false;
    baseline_low_date?: string;
    baseline_high_date?: string;
    support?: Record<string, string>;
  };
}

/** A web-features redirect entry: the ID was renamed (moved) or split into several IDs */
export type WebFeatureRedirect =
  | { kind: "moved"; redirect_target: string }
  | { kind: "split"; redirect_targets: string[] };

export type WebFeatureEntry = WebFeature | WebFeatureRedirect;
