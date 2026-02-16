import { describe, it, expect } from "vitest";
import {
  formatCompatCheckMarkdown,
  formatSearchMarkdown,
  formatBaselineMarkdown,
  formatBaselineListMarkdown,
  formatCompareMarkdown,
  formatBrowsersMarkdown,
  formatCheckSupportMarkdown,
  truncateIfNeeded,
} from "../../src/utils/formatter.js";
import type { FeatureCompatResult, BaselineFeatureResult, BrowserInfo } from "../../src/types.js";

describe("formatter", () => {
  describe("formatCompatCheckMarkdown", () => {
    it("should format compat check result as markdown", () => {
      const result: FeatureCompatResult = {
        id: "api.fetch",
        support: {
          chrome: { version_added: "42" },
          firefox: { version_added: "39" },
        },
        status: { experimental: false, standard_track: true, deprecated: false },
        baseline: { status: "high", low_date: "2015-01-01", high_date: "2017-06-01" },
      };

      const md = formatCompatCheckMarkdown(result);
      expect(md).toContain("# api.fetch");
      expect(md).toContain("Standard Track");
      expect(md).toContain("Widely Available");
      expect(md).toContain("| chrome |");
      expect(md).toContain("42+");
    });

    it("should show experimental and deprecated badges", () => {
      const result: FeatureCompatResult = {
        id: "api.experimental",
        support: { chrome: { version_added: "100" } },
        status: { experimental: true, standard_track: false, deprecated: true },
      };

      const md = formatCompatCheckMarkdown(result);
      expect(md).toContain("Experimental");
      expect(md).toContain("Deprecated");
    });

    it("should show MDN and spec links", () => {
      const result: FeatureCompatResult = {
        id: "api.test",
        support: {},
        mdn_url: "https://developer.mozilla.org/test",
        spec_url: "https://spec.example.com/test",
      };

      const md = formatCompatCheckMarkdown(result);
      expect(md).toContain("[MDN]");
      expect(md).toContain("[Spec]");
    });
  });

  describe("formatSearchMarkdown", () => {
    it("should format search results with query", () => {
      const results = {
        total: 10,
        features: [
          { id: "api.fetch", deprecated: false, experimental: false, standard_track: true },
          { id: "api.fetch.body", deprecated: false, experimental: false, standard_track: true },
        ],
        has_more: true,
      };

      const md = formatSearchMarkdown(results, "fetch");
      expect(md).toContain('Search Results: "fetch"');
      expect(md).toContain("**10** features");
      expect(md).toContain("`api.fetch`");
      expect(md).toContain("more results available");
    });
  });

  describe("formatCompareMarkdown", () => {
    it("should create side-by-side comparison table", () => {
      const results: FeatureCompatResult[] = [
        {
          id: "api.fetch",
          support: { chrome: { version_added: "42" }, firefox: { version_added: "39" } },
          baseline: { status: "high" },
        },
        {
          id: "api.XMLHttpRequest",
          support: { chrome: { version_added: "1" }, firefox: { version_added: "1" } },
          baseline: { status: "high" },
        },
      ];

      const md = formatCompareMarkdown(results, []);
      expect(md).toContain("Feature Comparison");
      expect(md).toContain("`api.fetch`");
      expect(md).toContain("`api.XMLHttpRequest`");
      expect(md).toContain("Baseline Status");
    });

    it("should show not found features", () => {
      const md = formatCompareMarkdown(
        [{ id: "api.fetch", support: {}, baseline: null }],
        ["api.nonexistent"]
      );
      expect(md).toContain("Not found");
      expect(md).toContain("`api.nonexistent`");
    });
  });

  describe("formatBrowsersMarkdown", () => {
    it("should format browser list grouped by type", () => {
      const browsers: BrowserInfo[] = [
        { id: "chrome", name: "Chrome", type: "desktop", current_version: "120" },
        { id: "safari_ios", name: "Safari on iOS", type: "mobile", current_version: "17.0" },
      ];

      const md = formatBrowsersMarkdown(browsers);
      expect(md).toContain("Tracked Browsers");
      expect(md).toContain("**2** browsers");
      expect(md).toContain("## Desktop");
      expect(md).toContain("## Mobile");
      expect(md).toContain("Chrome");
    });
  });

  describe("formatCheckSupportMarkdown", () => {
    it("should format browser version feature list", () => {
      const results = {
        total: 5,
        features: [
          { id: "css.properties.mask", version_added: "120" },
          { id: "css.properties.mask-clip", version_added: "120" },
        ],
        has_more: true,
      };

      const md = formatCheckSupportMarkdown("chrome", "120", results);
      expect(md).toContain("Features added in chrome 120");
      expect(md).toContain("**5** features");
      expect(md).toContain("`css.properties.mask`");
    });
  });

  describe("truncateIfNeeded", () => {
    it("should not truncate short text", () => {
      const text = "Hello, world!";
      expect(truncateIfNeeded(text)).toBe(text);
    });

    it("should truncate text exceeding character limit", () => {
      const longText = "x".repeat(30000);
      const result = truncateIfNeeded(longText);
      expect(result.length).toBeLessThan(longText.length);
      expect(result).toContain("truncated");
    });
  });
});
