import { describe, it, expect } from "vitest";
import {
  getFeatureCompat,
  searchFeatures,
  getBrowsers,
  findFeaturesByBrowserVersion,
  getCategories,
} from "../../src/services/bcd-service.js";

describe("bcd-service", () => {
  describe("getFeatureCompat", () => {
    it("should return compat data for a known API feature", () => {
      const result = getFeatureCompat("api.fetch");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("api.fetch");
      expect(result!.support).toBeDefined();
      expect(result!.support.chrome).toBeDefined();
      expect(result!.support.chrome.version_added).toBeDefined();
    });

    it("should return compat data for a CSS feature", () => {
      const result = getFeatureCompat("css.properties.grid");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("css.properties.grid");
    });

    it("should return compat data for a JavaScript feature", () => {
      const result = getFeatureCompat("javascript.builtins.Promise");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("javascript.builtins.Promise");
    });

    it("should return null for non-existent feature", () => {
      const result = getFeatureCompat("api.NonExistentFeature12345");
      expect(result).toBeNull();
    });

    it("should filter browsers when specified", () => {
      const result = getFeatureCompat("api.fetch", ["chrome", "safari"]);
      expect(result).not.toBeNull();
      expect(Object.keys(result!.support)).toHaveLength(2);
      expect(result!.support.chrome).toBeDefined();
      expect(result!.support.safari).toBeDefined();
      expect(result!.support.firefox).toBeUndefined();
    });

    it("should default to desktop browsers when no filter specified", () => {
      const result = getFeatureCompat("api.fetch");
      expect(result).not.toBeNull();
      const browsers = Object.keys(result!.support);
      expect(browsers).toContain("chrome");
      expect(browsers).toContain("edge");
      expect(browsers).toContain("firefox");
      expect(browsers).toContain("safari");
    });

    it("should include status information", () => {
      const result = getFeatureCompat("api.fetch");
      expect(result).not.toBeNull();
      expect(result!.status).toBeDefined();
      expect(typeof result!.status!.standard_track).toBe("boolean");
      expect(typeof result!.status!.experimental).toBe("boolean");
      expect(typeof result!.status!.deprecated).toBe("boolean");
    });
  });

  describe("searchFeatures", () => {
    it("should find features matching a query", () => {
      const result = searchFeatures("fetch");
      expect(result.total).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
      // searchFeatures is case-insensitive
      expect(result.features[0].id.toLowerCase()).toContain("fetch");
    });

    it("should filter by category", () => {
      const result = searchFeatures("fetch", "api");
      expect(result.total).toBeGreaterThan(0);
      for (const feature of result.features) {
        expect(feature.id).toMatch(/^api\./);
      }
    });

    it("should support pagination with limit and offset", () => {
      const page1 = searchFeatures("push", undefined, 5, 0);
      const page2 = searchFeatures("push", undefined, 5, 5);

      expect(page1.features.length).toBeLessThanOrEqual(5);
      if (page1.total > 5) {
        expect(page2.features.length).toBeGreaterThan(0);
        expect(page1.features[0].id).not.toBe(page2.features[0].id);
      }
    });

    it("should return has_more flag correctly", () => {
      const result = searchFeatures("fetch", undefined, 2);
      if (result.total > 2) {
        expect(result.has_more).toBe(true);
      }
    });

    it("should return empty for nonsense query", () => {
      const result = searchFeatures("zzzzzzzznonexistent12345");
      expect(result.total).toBe(0);
      expect(result.features).toHaveLength(0);
    });
  });

  describe("getBrowsers", () => {
    it("should return a list of browsers", () => {
      const browsers = getBrowsers();
      expect(browsers.length).toBeGreaterThan(0);
    });

    it("should include Chrome browser info", () => {
      const browsers = getBrowsers();
      const chrome = browsers.find((b) => b.id === "chrome");
      expect(chrome).toBeDefined();
      expect(chrome!.name).toBe("Chrome");
      expect(chrome!.type).toBe("desktop");
    });

    it("should include browser type classification", () => {
      const browsers = getBrowsers();
      const types = new Set(browsers.map((b) => b.type));
      expect(types).toContain("desktop");
      expect(types).toContain("mobile");
    });
  });

  describe("findFeaturesByBrowserVersion", () => {
    it("should find CSS features added in Chrome 120", () => {
      const result = findFeaturesByBrowserVersion("chrome", "120", "css");
      expect(result.total).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
      for (const f of result.features) {
        expect(f.version_added).toBe("120");
        expect(f.id).toMatch(/^css\./);
      }
    });

    it("should support pagination", () => {
      const result = findFeaturesByBrowserVersion("chrome", "120", "css", 3, 0);
      expect(result.features.length).toBeLessThanOrEqual(3);
      if (result.total > 3) {
        expect(result.has_more).toBe(true);
      }
    });

    it("should return empty for unknown version", () => {
      const result = findFeaturesByBrowserVersion("chrome", "999999");
      expect(result.total).toBe(0);
      expect(result.features).toHaveLength(0);
    });
  });

  describe("getCategories", () => {
    it("should return BCD categories", () => {
      const categories = getCategories();
      expect(categories).toContain("api");
      expect(categories).toContain("css");
      expect(categories).toContain("javascript");
      expect(categories).toContain("html");
    });
  });
});
