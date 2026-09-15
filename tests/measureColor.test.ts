import { describe, expect, it } from "vitest";
import {
  D65,
  applyGains,
  deltaE76,
  labToLch,
  linearToSrgb,
  linearToXyz,
  meanLinear,
  median,
  rgbToLab,
  rgbToLch,
  srgbToLinear,
  summariseRegion,
  toLinear,
  trimmedMean,
  whiteBalanceGains,
  type Lab,
} from "../measure/color";

/**
 * Reference sRGB to CIE Lab (D65, 2 degree observer) values. These are the
 * standard published figures, not numbers produced by this implementation.
 */
const REFERENCE: [string, [number, number, number], [number, number, number]][] = [
  ["black", [0, 0, 0], [0, 0, 0]],
  ["white", [255, 255, 255], [100, 0, 0]],
  ["red", [255, 0, 0], [53.2408, 80.0925, 67.2032]],
  ["green", [0, 255, 0], [87.7347, -86.1827, 83.1793]],
  ["blue", [0, 0, 255], [32.297, 79.1875, -107.8602]],
  ["cyan", [0, 255, 255], [91.1132, -48.0875, -14.1312]],
  ["magenta", [255, 0, 255], [60.3242, 98.2343, -60.8249]],
  ["yellow", [255, 255, 0], [97.1393, -21.5537, 94.478]],
  ["mid grey", [128, 128, 128], [53.5851, 0, 0]],
];

describe("sRGB to Lab against published reference values", () => {
  it.each(REFERENCE)("%s", (_name, [r, g, b], [L, a, bb]) => {
    const lab = rgbToLab({ r, g, b });
    expect(lab.L).toBeCloseTo(L, 3);
    expect(lab.a).toBeCloseTo(a, 3);
    expect(lab.b).toBeCloseTo(bb, 3);
  });

  it("keeps every neutral grey at a = b = 0", () => {
    // The published sRGB matrix constants are rounded, so a neutral lands a few
    // parts in 10^6 off zero rather than exactly on it. Negligible in Lab, but
    // it is why this asserts to 4 places and not 6.
    for (const v of [0, 32, 64, 96, 128, 160, 192, 224, 255]) {
      const lab = rgbToLab({ r: v, g: v, b: v });
      expect(lab.a, `grey ${v}`).toBeCloseTo(0, 4);
      expect(lab.b, `grey ${v}`).toBeCloseTo(0, 4);
    }
  });

  it("increases L monotonically with grey level", () => {
    let last = -1;
    for (let v = 0; v <= 255; v += 15) {
      const { L } = rgbToLab({ r: v, g: v, b: v });
      expect(L).toBeGreaterThan(last);
      last = L;
    }
  });
});

describe("transfer curve", () => {
  it("matches the sRGB piecewise definition at both ends", () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 12);
    // Below the 0.04045 knee the curve is the linear segment.
    expect(srgbToLinear(10)).toBeCloseTo(10 / 255 / 12.92, 12);
  });

  it("round-trips through the inverse", () => {
    for (const v of [0, 1, 10, 55, 128, 200, 254, 255]) {
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 9);
    }
  });

  it("is not a plain gamma 2.2", () => {
    // A common shortcut that would shift every measurement slightly.
    expect(srgbToLinear(128)).not.toBeCloseTo(Math.pow(128 / 255, 2.2), 4);
  });
});

describe("XYZ", () => {
  it("maps white to the D65 reference white", () => {
    const xyz = linearToXyz(toLinear({ r: 255, g: 255, b: 255 }));
    expect(xyz.x).toBeCloseTo(D65.x, 3);
    expect(xyz.y).toBeCloseTo(D65.y, 3);
    expect(xyz.z).toBeCloseTo(D65.z, 3);
  });
});

describe("Display P3 versus sRGB", () => {
  /**
   * The reason decode.ts must read the ICC profile: identical encoded bytes
   * describe different colours in the two gamuts, and the difference lands on
   * hue angle — the axis a season turns on.
   */
  it("gives the same numbers only for neutrals", () => {
    const grey = { r: 128, g: 128, b: 128 };
    const asSrgb = rgbToLab(grey, "srgb");
    const asP3 = rgbToLab(grey, "display-p3");
    expect(deltaE76(asSrgb, asP3)).toBeLessThan(1);
  });

  it("shifts a saturated colour materially", () => {
    const red = { r: 220, g: 60, b: 50 };
    expect(deltaE76(rgbToLab(red, "srgb"), rgbToLab(red, "display-p3"))).toBeGreaterThan(5);
  });

  it("shifts the hue angle of a skin-like value", () => {
    // A mid-tone skin sample. If a P3 photo is measured as sRGB, this is the
    // error that propagates into the hue axis.
    const skin = { r: 198, g: 152, b: 122 };
    const srgbHue = rgbToLch(skin, "srgb").h;
    const p3Hue = rgbToLch(skin, "display-p3").h;
    expect(Math.abs(srgbHue - p3Hue)).toBeGreaterThan(0.5);
  });
});

describe("robust statistics", () => {
  it("takes the median of odd and even counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });

  it("does not mutate its input", () => {
    const input = [5, 3, 9, 1];
    median(input);
    trimmedMean(input);
    expect(input).toEqual([5, 3, 9, 1]);
  });

  it("discards the extremes a specular highlight would create", () => {
    // Nine skin samples plus one blown specular highlight.
    const values = [50, 51, 52, 50, 49, 51, 50, 52, 49, 100];
    const trimmed = trimmedMean(values, 0.2);
    const plainMean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(trimmed).toBeGreaterThan(49);
    expect(trimmed).toBeLessThan(52);
    // The highlight drags the plain mean out of the skin range entirely.
    expect(plainMean).toBeGreaterThan(55);
    expect(plainMean - trimmed).toBeGreaterThan(4);
  });

  it("falls back to the full set when trimming would empty it", () => {
    expect(trimmedMean([4, 8], 0.5)).toBe(6);
  });

  it("equals the plain mean at proportion 0", () => {
    expect(trimmedMean([1, 2, 3, 10], 0)).toBe(4);
  });

  it("returns NaN for an empty region rather than a misleading zero", () => {
    expect(median([])).toBeNaN();
    expect(trimmedMean([])).toBeNaN();
  });
});

describe("summariseRegion", () => {
  const pixels: Lab[] = [
    { L: 60, a: 10, b: 18 },
    { L: 62, a: 11, b: 19 },
    { L: 58, a: 9, b: 17 },
    { L: 61, a: 10, b: 18 },
    { L: 99, a: 0, b: 1 }, // specular highlight
  ];

  it("reports both statistics and the pixel count", () => {
    const s = summariseRegion(pixels);
    expect(s.pixelCount).toBe(5);
    expect(s.median.L).toBe(61);
    expect(s.trimmedMean.L).toBeGreaterThan(0);
  });

  it("derives LCh from the median, which the highlight cannot drag", () => {
    const s = summariseRegion(pixels);
    expect(s.lch).toEqual(labToLch(s.median));
    expect(s.lch.L).toBe(61);
    expect(s.lch.h).toBeGreaterThan(0);
    expect(s.lch.h).toBeLessThan(90);
  });
});

describe("LCh", () => {
  it("wraps hue into 0-360", () => {
    expect(labToLch({ L: 50, a: 10, b: -10 }).h).toBeCloseTo(315, 6);
    expect(labToLch({ L: 50, a: -10, b: -10 }).h).toBeCloseTo(225, 6);
    expect(labToLch({ L: 50, a: 10, b: 10 }).h).toBeCloseTo(45, 6);
  });

  it("gives a neutral zero chroma", () => {
    expect(labToLch({ L: 50, a: 0, b: 0 }).C).toBe(0);
  });

  it("puts a typical skin sample in the warm quadrant", () => {
    const { h, C } = rgbToLch({ r: 198, g: 152, b: 122 });
    expect(h).toBeGreaterThan(40);
    expect(h).toBeLessThan(80);
    expect(C).toBeGreaterThan(10);
  });
});

describe("white balance", () => {
  it("neutralises the reference it is given", () => {
    const warmCast = toLinear({ r: 200, g: 180, b: 150 });
    const wb = whiteBalanceGains(warmCast, "gray-card");
    const corrected = applyGains(warmCast, wb.gains);
    expect(corrected.r).toBeCloseTo(corrected.g, 9);
    expect(corrected.g).toBeCloseTo(corrected.b, 9);
  });

  it("records which method was used", () => {
    for (const m of ["gray-card", "sclera", "gray-world"] as const) {
      expect(whiteBalanceGains({ r: 0.5, g: 0.4, b: 0.3 }, m).method).toBe(m);
    }
  });

  it("is a no-op for method 'none'", () => {
    const wb = whiteBalanceGains({ r: 0.5, g: 0.4, b: 0.3 }, "none");
    expect(wb.gains).toEqual({ r: 1, g: 1, b: 1 });
  });

  it("leaves an already-neutral reference alone", () => {
    const neutral = toLinear({ r: 128, g: 128, b: 128 });
    const wb = whiteBalanceGains(neutral, "gray-card");
    expect(wb.gains.r).toBeCloseTo(1, 9);
    expect(wb.gains.g).toBeCloseTo(1, 9);
    expect(wb.gains.b).toBeCloseTo(1, 9);
  });

  it("cools a warm-cast skin sample toward neutral", () => {
    // Tungsten-ish cast: correcting on the sclera should pull hue angle down.
    const cast = toLinear({ r: 210, g: 185, b: 150 });
    const skin = { r: 205, g: 150, b: 118 };
    const before = rgbToLch(skin).h;
    const gains = whiteBalanceGains(cast, "sclera").gains;
    const balanced = applyGains(toLinear(skin), gains);
    const after = labToLch(
      rgbToLab({
        r: linearToSrgb(balanced.r),
        g: linearToSrgb(balanced.g),
        b: linearToSrgb(balanced.b),
      })
    ).h;
    expect(after).toBeLessThan(before);
  });

  it("does not divide by zero on a black reference", () => {
    const wb = whiteBalanceGains({ r: 0, g: 0, b: 0 }, "gray-world");
    expect(Number.isFinite(wb.gains.r)).toBe(true);
    expect(wb.gains).toEqual({ r: 1, g: 1, b: 1 });
  });

  it("averages in linear light, not encoded values", () => {
    // Averaging gamma-encoded values biases dark. Black and white must average
    // to linear 0.5, which is encoded ~188, not 128.
    const mean = meanLinear([
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
    ]);
    expect(mean.r).toBeCloseTo(0.5, 9);
    expect(linearToSrgb(mean.r)).toBeGreaterThan(180);
  });
});
