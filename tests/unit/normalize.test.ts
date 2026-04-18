import { describe, expect, it } from "vitest";
import { normalizeBrowserVersion, normalizeSearchQuery } from "../../src/utils/normalize.js";

describe("normalizeSearchQuery", () => {
  it("returns only the original when there are no separators", () => {
    expect(normalizeSearchQuery("PushManager")).toEqual(["PushManager"]);
    expect(normalizeSearchQuery("fetch")).toEqual(["fetch"]);
  });

  it("adds a stripped variant for kebab-case input", () => {
    expect(normalizeSearchQuery("view-transition")).toEqual(["view-transition", "viewtransition"]);
    expect(normalizeSearchQuery("service-worker")).toEqual(["service-worker", "serviceworker"]);
  });

  it("adds a stripped variant for snake_case input", () => {
    expect(normalizeSearchQuery("service_worker")).toEqual(["service_worker", "serviceworker"]);
  });

  it("adds a stripped variant for whitespace-separated input", () => {
    expect(normalizeSearchQuery("push manager")).toEqual(["push manager", "pushmanager"]);
  });

  it("collapses multiple consecutive separators", () => {
    expect(normalizeSearchQuery("view--transition")).toEqual([
      "view--transition",
      "viewtransition",
    ]);
    expect(normalizeSearchQuery("view - transition")).toEqual([
      "view - transition",
      "viewtransition",
    ]);
  });

  it("preserves the original as the first candidate (ordering matters)", () => {
    const candidates = normalizeSearchQuery("view-transition");
    expect(candidates[0]).toBe("view-transition");
  });

  it("does not return an empty string fallback for separator-only input", () => {
    // "---" → "" should not be added as a candidate
    const candidates = normalizeSearchQuery("---");
    expect(candidates).toEqual(["---"]);
  });
});

describe("normalizeBrowserVersion", () => {
  it("returns only the original when no trailing .0 is present", () => {
    expect(normalizeBrowserVersion("17")).toEqual(["17"]);
    expect(normalizeBrowserVersion("17.1")).toEqual(["17.1"]);
    expect(normalizeBrowserVersion("17.10")).toEqual(["17.10"]);
  });

  it("strips a single trailing .0", () => {
    expect(normalizeBrowserVersion("17.0")).toEqual(["17.0", "17"]);
    expect(normalizeBrowserVersion("120.0")).toEqual(["120.0", "120"]);
  });

  it("strips multiple trailing .0 segments", () => {
    expect(normalizeBrowserVersion("17.0.0")).toEqual(["17.0.0", "17"]);
    expect(normalizeBrowserVersion("1.0.0.0")).toEqual(["1.0.0.0", "1"]);
  });

  it("leaves non-zero decimals intact", () => {
    expect(normalizeBrowserVersion("17.1.0")).toEqual(["17.1.0", "17.1"]);
    expect(normalizeBrowserVersion("17.10")).toEqual(["17.10"]);
  });

  it("preserves the original as the first candidate (ordering matters)", () => {
    const candidates = normalizeBrowserVersion("17.0");
    expect(candidates[0]).toBe("17.0");
  });
});
