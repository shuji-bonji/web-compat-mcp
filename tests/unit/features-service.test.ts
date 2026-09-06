import { describe, it, expect } from "vitest";
import {
  getBaselineStatus,
  listByBaseline,
  searchWebFeatures,
  findWebFeatureByBcdId,
  getGroups,
  resolveFeatureRedirect,
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

  describe("web-features 3.x entry kinds", () => {
    it("should follow a moved ID to its target and record redirected_from", () => {
      // "grid-lanes" was renamed to "masonry" in web-features 3.x
      const redirect = resolveFeatureRedirect("grid-lanes");
      expect(redirect?.kind).toBe("moved");
      if (redirect?.kind !== "moved") return;

      const result = getBaselineStatus("grid-lanes");
      expect(result).not.toBeNull();
      expect(result!.id).toBe(redirect.redirect_target);
      expect(result!.redirected_from).toBe("grid-lanes");
      expect(result!.name).toBeDefined();
    });

    it("should return null for a split ID and expose its targets", () => {
      // "single-color-gradients" was split into several IDs in web-features 3.x
      const redirect = resolveFeatureRedirect("single-color-gradients");
      expect(redirect?.kind).toBe("split");
      if (redirect?.kind !== "split") return;

      expect(redirect.redirect_targets.length).toBeGreaterThan(1);
      expect(getBaselineStatus("single-color-gradients")).toBeNull();
    });

    it("should return null redirect for regular and unknown IDs", () => {
      expect(resolveFeatureRedirect("fetch")).toBeNull();
      expect(resolveFeatureRedirect("definitely-not-a-feature")).toBeNull();
    });

    it("should never list or search moved/split entries", () => {
      const all = listByBaseline(undefined, undefined, 5000, 0);
      const ids = all.features.map((f) => f.id);
      expect(ids).not.toContain("grid-lanes");
      expect(ids).not.toContain("single-color-gradients");
      for (const f of all.features) expect(typeof f.name).toBe("string");
    });

    it("should expose groups as an array and keep group as its first entry", () => {
      const result = getBaselineStatus("fetch");
      expect(result).not.toBeNull();
      expect(Array.isArray(result!.groups)).toBe(true);
      expect(result!.groups.length).toBeGreaterThan(0);
      expect(result!.group).toBe(result!.groups[0]);
    });

    it("should match group filter against every group of a multi-group feature", () => {
      const all = listByBaseline(undefined, undefined, 5000, 0);
      const multi = all.features.find((f) => f.groups.length > 1);
      expect(multi).toBeDefined();
      if (!multi) return;

      const secondGroup = multi.groups[1];
      const filtered = listByBaseline(undefined, secondGroup, 5000, 0);
      expect(filtered.features.map((f) => f.id)).toContain(multi.id);
    });

    it("should surface discouraged metadata when present", () => {
      const result = getBaselineStatus("accessor-methods");
      expect(result).not.toBeNull();
      expect(result!.discouraged).toBeDefined();
      expect(result!.discouraged!.according_to.length).toBeGreaterThan(0);
    });
  });
});
