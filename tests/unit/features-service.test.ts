import { describe, it, expect } from "vitest";
import {
  getBaselineStatus,
  listByBaseline,
  searchWebFeatures,
  findWebFeatureByBcdId,
  getGroups,
} from "../../src/services/features-service.js";

describe("features-service", () => {
  describe("getBaselineStatus", () => {
    it("should return baseline data for a known feature", () => {
      const result = getBaselineStatus("fetch");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("fetch");
      expect(result!.name).toBeDefined();
      expect(result!.baseline).toBeDefined();
      expect(["high", "low", false]).toContain(result!.baseline.status);
    });

    it("should include browser support info", () => {
      const result = getBaselineStatus("fetch");
      expect(result).not.toBeNull();
      expect(result!.browser_support).toBeDefined();
      expect(typeof result!.browser_support).toBe("object");
    });

    it("should include compat_features mapping", () => {
      const result = getBaselineStatus("fetch");
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.compat_features)).toBe(true);
    });

    it("should return null for unknown feature", () => {
      const result = getBaselineStatus("nonexistent-feature-12345");
      expect(result).toBeNull();
    });
  });

  describe("listByBaseline", () => {
    it("should list all features without filter", () => {
      const result = listByBaseline(undefined, undefined, 5);
      expect(result.total).toBeGreaterThan(0);
      expect(result.features.length).toBeLessThanOrEqual(5);
    });

    it("should filter by high baseline status", () => {
      const result = listByBaseline("high", undefined, 10);
      expect(result.total).toBeGreaterThan(0);
      for (const f of result.features) {
        expect(f.baseline.status).toBe("high");
      }
    });

    it("should filter by low baseline status", () => {
      const result = listByBaseline("low", undefined, 10);
      expect(result.total).toBeGreaterThan(0);
      for (const f of result.features) {
        expect(f.baseline.status).toBe("low");
      }
    });

    it("should support pagination", () => {
      const page1 = listByBaseline(undefined, undefined, 3, 0);
      const page2 = listByBaseline(undefined, undefined, 3, 3);

      expect(page1.features.length).toBeLessThanOrEqual(3);
      if (page1.total > 3) {
        expect(page2.features.length).toBeGreaterThan(0);
        expect(page1.features[0].id).not.toBe(page2.features[0].id);
      }
    });

    it("should return has_more flag correctly", () => {
      const result = listByBaseline(undefined, undefined, 2);
      if (result.total > 2) {
        expect(result.has_more).toBe(true);
      }
    });
  });

  describe("searchWebFeatures", () => {
    it("should find features by keyword", () => {
      const result = searchWebFeatures("grid");
      expect(result.total).toBeGreaterThan(0);
      expect(result.features.length).toBeGreaterThan(0);
    });

    it("should return empty for nonsense query", () => {
      const result = searchWebFeatures("zzzznonexistent12345");
      expect(result.total).toBe(0);
      expect(result.features).toHaveLength(0);
    });
  });

  describe("findWebFeatureByBcdId", () => {
    it("should find web-feature by BCD ID", () => {
      // api.fetch should map to the 'fetch' web feature
      const result = findWebFeatureByBcdId("api.fetch");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
    });

    it("should return null for unknown BCD ID", () => {
      const result = findWebFeatureByBcdId("api.NonExistentAPI12345");
      expect(result).toBeNull();
    });
  });

  describe("getGroups", () => {
    it("should return a list of groups", () => {
      const groups = getGroups();
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0]).toHaveProperty("id");
      expect(groups[0]).toHaveProperty("name");
    });
  });
});
