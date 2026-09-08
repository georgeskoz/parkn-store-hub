import { describe, it, expect } from "vitest";
import {
  bucketCoordinate,
  bucketMapSize,
  clampHeroZoom,
  projectToPixel,
  slugifyCity,
  HERO_MAP_MIN_ZOOM,
  HERO_MAP_MAX_ZOOM,
} from "./staticMap";

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

describe("clampHeroZoom", () => {
  it("clamps below the minimum", () => {
    expect(clampHeroZoom(HERO_MAP_MIN_ZOOM - 5)).toBe(HERO_MAP_MIN_ZOOM);
  });

  it("clamps above the maximum", () => {
    expect(clampHeroZoom(HERO_MAP_MAX_ZOOM + 5)).toBe(HERO_MAP_MAX_ZOOM);
  });

  it("rounds a fractional in-range value", () => {
    expect(clampHeroZoom(14.6)).toBe(15);
  });
});

describe("projectToPixel (hero zoom control pin alignment)", () => {
  // Montreal-ish center; a pin ~0.1deg east and ~0.1deg north of it — small
  // enough to stay well inside the hero's cropped image at every zoom this
  // test exercises.
  const center = { latitude: 45.5, longitude: -73.6 };
  const eastPin = { latitude: 45.5, longitude: -73.5 };
  const northPin = { latitude: 45.6, longitude: -73.6 };
  const size = { width: 640, height: 640 };

  it("always projects the center point to the exact image center, at every zoom", () => {
    for (let z = HERO_MAP_MIN_ZOOM; z <= HERO_MAP_MAX_ZOOM; z++) {
      const { x, y } = projectToPixel(center, center, z, size.width, size.height);
      expect(x).toBeCloseTo(size.width / 2, 6);
      expect(y).toBeCloseTo(size.height / 2, 6);
    }
  });

  it("places an east pin to the right of center and a north pin above it, at every zoom", () => {
    for (let z = HERO_MAP_MIN_ZOOM; z <= HERO_MAP_MAX_ZOOM; z++) {
      const east = projectToPixel(eastPin, center, z, size.width, size.height);
      const north = projectToPixel(northPin, center, z, size.width, size.height);
      expect(east.x).toBeGreaterThan(size.width / 2);
      expect(north.y).toBeLessThan(size.height / 2);
    }
  });

  it("doubles a pin's pixel offset from center for each +1 step in zoom, matching the 2^zoom scale factor the +/- controls step through", () => {
    for (let z = HERO_MAP_MIN_ZOOM; z < HERO_MAP_MAX_ZOOM; z++) {
      const atZ = projectToPixel(eastPin, center, z, size.width, size.height);
      const atZPlus1 = projectToPixel(eastPin, center, z + 1, size.width, size.height);
      const offsetAtZ = atZ.x - size.width / 2;
      const offsetAtZPlus1 = atZPlus1.x - size.width / 2;
      expect(offsetAtZPlus1).toBeCloseTo(offsetAtZ * 2, 6);
    }
  });

  it("stays finite at both zoom extremes the +/- controls can reach", () => {
    for (const z of [HERO_MAP_MIN_ZOOM, HERO_MAP_MAX_ZOOM]) {
      const { x, y } = projectToPixel(eastPin, center, z, size.width, size.height);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
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
