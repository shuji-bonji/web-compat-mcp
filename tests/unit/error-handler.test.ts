import { describe, it, expect } from "vitest";
import {
  handleError,
  featureNotFoundError,
  webFeatureNotFoundError,
} from "../../src/utils/error-handler.js";

describe("error-handler", () => {
  describe("handleError", () => {
    it("should handle Error instances", () => {
      const result = handleError(new Error("test error"));
      expect(result).toContain("test error");
    });

    it("should handle non-Error values", () => {
      const result = handleError("string error");
      expect(result).toContain("string error");
    });
  });

  describe("featureNotFoundError", () => {
    it("should suggest dot notation when missing dots", () => {
      const result = featureNotFoundError("fetch");
      expect(result).toContain("dot notation");
      expect(result).toContain("api.fetch");
    });

    it("should suggest camelCase when kebab-case is used", () => {
      const result = featureNotFoundError("api.push-manager");
      expect(result).toContain("camelCase");
      expect(result).toContain("pushManager");
    });

    it("should suggest using compat_search", () => {
      const result = featureNotFoundError("api.test");
      expect(result).toContain("compat_search");
    });
  });

  describe("webFeatureNotFoundError", () => {
    it("should suggest kebab-case format", () => {
      const result = webFeatureNotFoundError("containerQueries");
      expect(result).toContain("kebab-case");
    });
  });
});
