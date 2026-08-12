import { describe, it, expect } from "vitest";
import { bucketCoordinate, bucketMapSize, slugifyCity } from "./staticMap";

describe("bucketCoordinate", () => {
  it("rounds to 2 decimal places", () => {
    expect(bucketCoordinate(45.50171234)).toBe(45.5);
    expect(bucketCoordinate(45.5049)).toBe(45.5);
  });

  it("collapses two nearby per-visitor coordinates from the same city to the same bucket", () => {
    // Two different IPs geolocated to slightly different points within Montreal.
    const visitorA = bucketCoordinate(45.50171234);
    const visitorB = bucketCoordinate(45.50239876);
    expect(visitorA).toBe(visitorB);
  });

  it("handles negative coordinates and zero", () => {
    expect(bucketCoordinate(-73.56731)).toBe(-73.57);
    expect(bucketCoordinate(0)).toBe(0);
  });
});

describe("slugifyCity", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyCity("San Francisco")).toBe("san-francisco");
  });

  it("strips diacritics", () => {
    expect(slugifyCity("Québec")).toBe("quebec");
  });

  it("collapses non-alphanumeric runs and trims edge hyphens", () => {
    expect(slugifyCity("  St. John's! ")).toBe("st-john-s");
  });

  it("never throws on empty or symbol-only input", () => {
    expect(slugifyCity("")).toBe("");
    expect(slugifyCity("!!!")).toBe("");
  });

  it("caps length so an unexpectedly huge header value can't blow up the cache key", () => {
    const huge = "a".repeat(500);
    expect(slugifyCity(huge).length).toBeLessThanOrEqual(60);
  });
});

describe("bucketMapSize", () => {
  it("clamps to Google's real per-axis limit on the long side", () => {
    const { width, height } = bucketMapSize(1600, 900);
    expect(Math.max(width, height)).toBe(640);
  });

  it("never divides by zero or returns non-finite values for a zero-size container", () => {
    const { width, height } = bucketMapSize(0, 0);
    expect(Number.isFinite(width)).toBe(true);
    expect(Number.isFinite(height)).toBe(true);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it("clamps extreme aspect ratios instead of producing a degenerate image", () => {
    const { width, height } = bucketMapSize(10000, 1);
    expect(width / height).toBeLessThanOrEqual(4);
  });
});
