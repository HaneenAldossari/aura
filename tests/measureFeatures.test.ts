import { describe, expect, it } from "vitest";
import { averageFeatures, buildFeatures } from "../measure/features";
import { labToLch, rgbToLab, type Lab, type RGB } from "../measure/color";
import { score } from "../measure/score";
import type { AllRegions, RegionPixels } from "../measure/regions";
import {
  PRODUCT,
  dominantFromRgb,
  estimateBackground,
  kMeansLab,
  labToHex,
  productColors,
} from "../measure/productColor";
import type { ImageLike } from "../measure/regions";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** A region of `count` pixels jittered around a Lab centre. */
function region(
  name: RegionPixels["name"],
  centre: Lab,
  count = 3000,
  unavailable?: RegionPixels["unavailable"]
): RegionPixels {
  const pixels: Lab[] = Array.from({ length: count }, (_, i) => ({
    L: centre.L + ((i % 7) - 3) * 0.4,
    a: centre.a + ((i % 5) - 2) * 0.2,
    b: centre.b + ((i % 3) - 1) * 0.3,
  }));
  return { name, pixels, count, considered: count * 2, unavailable };
}

function regions(overrides: Partial<AllRegions> = {}): AllRegions {
  return {
    skin: region("skin", { L: 62, a: 12, b: 16 }),
    hair: region("hair", { L: 22, a: 4, b: 6 }, 2000),
    eyes: region("eyes", { L: 30, a: 2, b: -4 }, 300),
    lips: region("lips", { L: 48, a: 26, b: 12 }, 500),
    ...overrides,
  };
}

describe("buildFeatures", () => {
  it("reports LCh per region alongside the raw Lab", () => {
    const f = buildFeatures(regions());
    expect(f.skin!.L).toBeCloseTo(62, 0);
    expect(f.skin!.C).toBeCloseTo(labToLch(f.skin!.lab).C, 9);
    expect(f.skin!.h).toBeGreaterThan(0);
    expect(f.skin!.trimmedLab).toBeDefined();
    expect(f.skin!.pixelCount).toBe(3000);
  });

  it("hands score() something it can consume", () => {
    const f = buildFeatures(regions());
    const result = score(f.forScoring);
    expect(result.primary).toBeTruthy();
    expect(result.hairUsed).toBe(true);
  });

  it("reports coverage per region", () => {
    expect(buildFeatures(regions()).coverage).toEqual({
      skin: 3000,
      hair: 2000,
      eyes: 300,
      lips: 500,
    });
  });

  it("throws when skin is missing, since nothing can be classified without it", () => {
    expect(() =>
      buildFeatures(regions({ skin: region("skin", { L: 62, a: 12, b: 16 }, 10, "too-few-pixels") }))
    ).toThrow(/skin region/i);
  });

  describe("an unusable region becomes null, never a number", () => {
    it("nulls hair for scoring when the mask found none", () => {
      const f = buildFeatures(
        regions({ hair: { name: "hair", pixels: [], count: 0, considered: 0, unavailable: "not-found" } })
      );
      expect(f.forScoring.hair).toBeNull();
      expect(f.hair).toBeNull();
      expect(score(f.forScoring).hairUsed).toBe(false);
    });

    it("nulls hair for scoring when it is dyed, but keeps it for display", () => {
      const f = buildFeatures(regions(), { hairStatus: "dyed" });
      expect(f.forScoring.hair).toBeNull();
      // Still shown, so the UI can say "we saw this, we're not using it".
      expect(f.hair).not.toBeNull();
      expect(f.hair!.unavailable).toBeUndefined();
      expect(score(f.forScoring).hairUsed).toBe(false);
    });

    it("keeps a too-thin hair region visible but marked", () => {
      const f = buildFeatures(
        regions({ hair: region("hair", { L: 22, a: 4, b: 6 }, 50, "too-few-pixels") })
      );
      expect(f.hair!.unavailable).toBe("too-few-pixels");
      expect(f.forScoring.hair).toBeNull();
    });

    /**
     * The failure this guards: a zero would be read as black hair and drag every
     * covered face toward Deep.
     */
    it("never lets a missing region reach the scorer as zero", () => {
      const f = buildFeatures(regions(), { hairStatus: "covered" });
      expect(f.forScoring.hair).not.toEqual({ L: 0, C: 0, h: 0 });
      expect(f.forScoring.hair).toBeNull();

      const covered = score(f.forScoring);
      const withHair = score(buildFeatures(regions()).forScoring);
      expect(covered.axes.value.value).toBeGreaterThan(withHair.axes.value.value);
    });
  });

  describe("contrast", () => {
    it("is the range of L*, not a mean of deltas", () => {
      const f = buildFeatures(regions());
      expect(f.contrast.range).toBeCloseTo(f.skin!.L - f.hair!.L, 5);
      expect(f.contrast.hairSkin).toBeCloseTo(f.hair!.L - f.skin!.L, 5);
      expect(f.contrast.eyesSkin).toBeCloseTo(f.eyes!.L - f.skin!.L, 5);
    });

    it("drops hair from the range when it is unusable", () => {
      const f = buildFeatures(regions(), { hairStatus: "covered" });
      expect(f.contrast.hairSkin).toBeNull();
      expect(f.contrast.range).toBeCloseTo(Math.abs(f.skin!.L - f.eyes!.L), 5);
    });

    it("is null when only skin is available", () => {
      const f = buildFeatures(
        regions({
          hair: { name: "hair", pixels: [], count: 0, considered: 0, unavailable: "not-found" },
          eyes: { name: "eyes", pixels: [], count: 0, considered: 0, unavailable: "not-found" },
        })
      );
      expect(f.contrast.range).toBeNull();
    });
  });

  it("carries the gamut through, including the assumed-srgb caveat", () => {
    expect(buildFeatures(regions(), { gamut: "display-p3" }).gamut).toBe("display-p3");
    expect(buildFeatures(regions(), { gamut: "assumed-srgb" }).gamut).toBe("assumed-srgb");
  });

  it("records the white-balance method when one was applied", () => {
    expect(buildFeatures(regions(), { whiteBalanceMethod: "sclera" }).whiteBalance).toEqual({
      method: "sclera",
    });
    expect(buildFeatures(regions()).whiteBalance).toBeNull();
  });
});

describe("averageFeatures — the second-photo path", () => {
  const lighter = buildFeatures(regions({ skin: region("skin", { L: 70, a: 12, b: 16 }) }));
  const darker = buildFeatures(regions({ skin: region("skin", { L: 54, a: 12, b: 16 }) }));

  it("averages Lab, landing between the two", () => {
    const merged = averageFeatures(lighter, darker);
    expect(merged.skin!.lab.L).toBeCloseTo(62, 0);
    expect(merged.skin!.L).toBeCloseTo(62, 0);
  });

  /**
   * Averaging L/C/h instead of Lab would put the mean of 350 and 10 degrees at
   * 180 — the opposite colour.
   */
  it("averages in Lab, not on the circular hue angle", () => {
    const warmish: Lab = { L: 60, a: 20, b: -2 }; // hue just below 360
    const coolish: Lab = { L: 60, a: 20, b: 2 }; // hue just above 0
    const a = buildFeatures(regions({ skin: region("skin", warmish) }));
    const b = buildFeatures(regions({ skin: region("skin", coolish) }));
    const merged = averageFeatures(a, b);
    // The true mean sits at hue ~0, not ~180.
    const h = merged.skin!.h;
    expect(Math.min(h, 360 - h)).toBeLessThan(10);
  });

  it("sums coverage", () => {
    expect(averageFeatures(lighter, darker).coverage.skin).toBe(6000);
  });

  it("takes the stricter hair status of the two photos", () => {
    const natural = buildFeatures(regions());
    const dyed = buildFeatures(regions(), { hairStatus: "dyed" });
    expect(averageFeatures(natural, dyed).hairStatus).not.toBe("natural");
    expect(averageFeatures(natural, dyed).forScoring.hair).toBeNull();
    expect(averageFeatures(natural, natural).hairStatus).toBe("natural");
  });

  it("degrades the gamut to assumed-srgb when the two disagree", () => {
    const p3 = buildFeatures(regions(), { gamut: "display-p3" });
    const srgb = buildFeatures(regions(), { gamut: "srgb" });
    expect(averageFeatures(p3, srgb).gamut).toBe("assumed-srgb");
    expect(averageFeatures(p3, p3).gamut).toBe("display-p3");
  });

  it("keeps whichever region one photo has and the other lacks", () => {
    const noEyes = buildFeatures(
      regions({ eyes: { name: "eyes", pixels: [], count: 0, considered: 0, unavailable: "not-found" } })
    );
    expect(averageFeatures(noEyes, lighter).eyes).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// productColor
// ─────────────────────────────────────────────────────────────────────────────

const W = 120;
const H = 120;

function makeProductImage(background: RGB, object: RGB, radius = 30): ImageLike {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inside = Math.hypot(x - W / 2, y - H / 2) < radius;
      const c = inside ? object : background;
      const i = (y * W + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H };
}

describe("labToHex", () => {
  it("round-trips the primaries", () => {
    for (const rgb of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 255 },
      { r: 18, g: 52, b: 86 },
    ]) {
      const hex = labToHex(rgbToLab(rgb));
      const expected = `#${[rgb.r, rgb.g, rgb.b]
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")}`.toUpperCase();
      expect(hex, JSON.stringify(rgb)).toBe(expected);
    }
  });

  it("clamps out-of-gamut Lab rather than emitting nonsense", () => {
    const hex = labToHex({ L: 50, a: 120, b: -120 });
    expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });
});

describe("kMeansLab", () => {
  it("separates two well-spaced groups", () => {
    const points: Lab[] = [
      ...Array.from({ length: 50 }, () => ({ L: 30, a: 40, b: 20 })),
      ...Array.from({ length: 30 }, () => ({ L: 80, a: -30, b: 10 })),
    ];
    const clusters = kMeansLab(points, 2);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].count).toBe(50);
    expect(clusters[1].count).toBe(30);
  });

  it("is deterministic — the same photo must give the same clusters", () => {
    const points: Lab[] = Array.from({ length: 200 }, (_, i) => ({
      L: 20 + (i % 5) * 15,
      a: ((i * 7) % 41) - 20,
      b: ((i * 13) % 37) - 18,
    }));
    expect(kMeansLab(points, 4)).toEqual(kMeansLab(points, 4));
  });

  it("never returns more clusters than points", () => {
    expect(kMeansLab([{ L: 50, a: 0, b: 0 }], 4)).toHaveLength(1);
    expect(kMeansLab([], 4)).toHaveLength(0);
  });

  it("orders clusters by size", () => {
    const clusters = dominantFromRgb([
      ...Array.from({ length: 10 }, () => ({ r: 200, g: 30, b: 30 })),
      ...Array.from({ length: 40 }, () => ({ r: 30, g: 30, b: 200 })),
    ], 2);
    expect(clusters[0].count).toBeGreaterThan(clusters[1].count);
  });
});

describe("background removal", () => {
  const WHITE: RGB = { r: 245, g: 245, b: 245 };
  const TEAL: RGB = { r: 20, g: 130, b: 130 };

  it("estimates the backdrop from the border", () => {
    const bg = estimateBackground(makeProductImage(WHITE, TEAL))!;
    expect(bg.L).toBeGreaterThan(90);
    expect(Math.abs(bg.a)).toBeLessThan(3);
  });

  it("finds the product colour, not the backdrop", () => {
    const result = productColors(makeProductImage(WHITE, TEAL));
    expect(result.backgroundRemoved).toBe(true);
    const dominant = result.colors[0];
    const teal = rgbToLab(TEAL);
    expect(Math.abs(dominant.lab.L - teal.L)).toBeLessThan(3);
    expect(dominant.hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(result.backgroundFraction).toBeGreaterThan(0.5);
  });

  it("reports coverage that sums to about 1", () => {
    const result = productColors(makeProductImage(WHITE, TEAL));
    const total = result.colors.reduce((s, c) => s + c.coverage, 0);
    expect(total).toBeGreaterThan(0.9);
    expect(total).toBeLessThanOrEqual(1.0001);
  });

  /**
   * A product filling the frame, or one the colour of its backdrop, would leave
   * nothing behind. Falling back to the whole image and saying so beats silently
   * returning the colour of a wall.
   */
  it("falls back and says so when nothing survives removal", () => {
    const flat = makeProductImage(TEAL, TEAL);
    const result = productColors(flat);
    expect(result.backgroundRemoved).toBe(false);
    expect(result.colors.length).toBeGreaterThan(0);
  });

  it("keeps a product that fills most of the frame", () => {
    const result = productColors(makeProductImage(WHITE, TEAL, 55));
    expect(result.colors[0].lab.L).toBeLessThan(70);
  });

  it("drops clusters below the coverage floor", () => {
    const result = productColors(makeProductImage(WHITE, TEAL));
    for (const c of result.colors) expect(c.coverage).toBeGreaterThanOrEqual(PRODUCT.minCoverage);
  });
});
