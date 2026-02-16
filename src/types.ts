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
  [key: string]: unknown;
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
  [key: string]: unknown;
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
  group?: string;
  caniuse?: string[];
}

/** Browser info */
export interface BrowserInfo {
  id: string;
  name: string;
  type: string;
  current_version?: string;
  release_date?: string;
}
