import { describe, it, expect } from "vitest";
import {
  CompatCheckInputSchema,
  CompatSearchInputSchema,
  CompatGetBaselineInputSchema,
  CompatListBaselineInputSchema,
  CompatCompareInputSchema,
  CompatListBrowsersInputSchema,
  CompatCheckSupportInputSchema,
} from "../../src/schemas/input-schemas.js";

describe("input-schemas", () => {
  describe("CompatCheckInputSchema", () => {
    it("should accept valid input", () => {
      const result = CompatCheckInputSchema.safeParse({
        feature: "api.fetch",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty feature", () => {
      const result = CompatCheckInputSchema.safeParse({ feature: "" });
      expect(result.success).toBe(false);
    });

    it("should accept browser filter", () => {
      const result = CompatCheckInputSchema.safeParse({
        feature: "api.fetch",
        browsers: ["chrome", "safari"],
      });
      expect(result.success).toBe(true);
    });

    it("should default response_format to markdown", () => {
      const result = CompatCheckInputSchema.parse({ feature: "api.fetch" });
      expect(result.response_format).toBe("markdown");
    });

    it("should reject unknown keys (strict mode)", () => {
      const result = CompatCheckInputSchema.safeParse({
        feature: "api.fetch",
        unknown_key: "value",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CompatSearchInputSchema", () => {
    it("should accept valid query", () => {
      const result = CompatSearchInputSchema.safeParse({ query: "fetch" });
      expect(result.success).toBe(true);
    });

    it("should reject too short query", () => {
      const result = CompatSearchInputSchema.safeParse({ query: "a" });
      expect(result.success).toBe(false);
    });

    it("should accept category filter", () => {
      const result = CompatSearchInputSchema.safeParse({
        query: "fetch",
        category: "api",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid category", () => {
      const result = CompatSearchInputSchema.safeParse({
        query: "fetch",
        category: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CompatCompareInputSchema", () => {
    it("should accept 2-5 features", () => {
      const result = CompatCompareInputSchema.safeParse({
        features: ["api.fetch", "api.XMLHttpRequest"],
      });
      expect(result.success).toBe(true);
    });

    it("should reject less than 2 features", () => {
      const result = CompatCompareInputSchema.safeParse({
        features: ["api.fetch"],
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 5 features", () => {
      const result = CompatCompareInputSchema.safeParse({
        features: ["a", "b", "c", "d", "e", "f"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CompatCheckSupportInputSchema", () => {
    it("should accept valid browser and version", () => {
      const result = CompatCheckSupportInputSchema.safeParse({
        browser: "chrome",
        version: "120",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing browser", () => {
      const result = CompatCheckSupportInputSchema.safeParse({
        version: "120",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CompatListBrowsersInputSchema", () => {
    it("should accept empty params (defaults)", () => {
      const result = CompatListBrowsersInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("CompatGetBaselineInputSchema", () => {
    it("should accept valid feature", () => {
      const result = CompatGetBaselineInputSchema.safeParse({
        feature: "container-queries",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CompatListBaselineInputSchema", () => {
    it("should accept status filter", () => {
      const result = CompatListBaselineInputSchema.safeParse({
        status: "high",
      });
      expect(result.success).toBe(true);
    });
  });
});
