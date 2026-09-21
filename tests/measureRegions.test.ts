import { describe, expect, it } from "vitest";
import {
  LANDMARKS,
  SEGMENT_CLASS,
  boundingBox,
  centroid,
  eyeDistance,
  faceHeightFraction,
  type Landmark,
} from "../measure/landmarks";
import {
  discPixels,
  extractEyes,
  extractHair,
  extractLips,
  extractSkin,
  isExcluded,
  pixelAt,
  regionCoverage,
  relativeLuminance,
  skinExclusionZones,
  trimLuminanceExtremes,
  type ImageLike,
} from "../measure/regions";
import {
  clippedFraction,
  detailEnergy,
  grayPatch,
  laplacianVariance,
  scleraCast,
} from "../measure/quality";
import type { RGB } from "../measure/color";

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic fixtures
// ─────────────────────────────────────────────────────────────────────────────

// 600px: large enough that a cheek patch clears SCORING.minRegionPixels.skin,
// as any real upload would. At 200px the patches are legitimately too thin.
const W = 600;
const H = 600;

/** A solid-colour image, optionally with a painter for specific pixels. */
function makeImage(
  base: RGB,
  paint?: (x: number, y: number) => RGB | null
): ImageLike {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = paint?.(x, y) ?? base;
      const i = (y * W + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H };
}

/**
 * A plausible face: 478 landmarks, with each named index set placed somewhere
 * sensible in normalised coordinates. Not anatomically real — enough to exercise
 * the geometry, the exclusion zones and the sampling.
 */
function makeFace(): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const put = (indices: readonly number[], x: number, y: number, spread = 0.01) => {
    indices.forEach((idx, n) => {
      lm[idx] = { x: x + (n % 3) * spread, y: y + Math.floor(n / 3) * spread };
    });
  };
  put(LANDMARKS.leftEye, 0.35, 0.4);
  put(LANDMARKS.rightEye, 0.6, 0.4);
  put(LANDMARKS.leftIris, 0.37, 0.41, 0.002);
  put(LANDMARKS.rightIris, 0.62, 0.41, 0.002);
  put(LANDMARKS.leftBrow, 0.34, 0.35);
  put(LANDMARKS.rightBrow, 0.61, 0.35);
  put(LANDMARKS.leftCheek, 0.3, 0.55);
  put(LANDMARKS.rightCheek, 0.65, 0.55);
  put(LANDMARKS.forehead, 0.48, 0.28);
  put(LANDMARKS.lips, 0.48, 0.72, 0.005);
  // Face oval spans most of the frame vertically.
  LANDMARKS.faceOval.forEach((idx, n) => {
    const t = (n / LANDMARKS.faceOval.length) * Math.PI * 2;
    lm[idx] = { x: 0.5 + 0.2 * Math.cos(t), y: 0.5 + 0.3 * Math.sin(t) };
  });
  return lm;
}

const SKIN: RGB = { r: 198, g: 152, b: 122 };

describe("landmark geometry", () => {
  const face = makeFace();

  it("averages a landmark set", () => {
    const c = centroid([{ x: 0, y: 0 }, { x: 1, y: 1 }], [0, 1]);
    expect(c).toEqual({ x: 0.5, y: 0.5 });
  });

  it("returns NaN rather than 0 for an empty set", () => {
    expect(centroid([], [0, 1]).x).toBeNaN();
  });

  it("skips missing landmarks instead of counting them as origin", () => {
    const sparse: Landmark[] = [{ x: 0.2, y: 0.2 }];
    expect(centroid(sparse, [0, 99]).x).toBeCloseTo(0.2, 9);
  });

  it("bounds a set", () => {
    const b = boundingBox([{ x: 0.1, y: 0.2 }, { x: 0.7, y: 0.9 }], [0, 1]);
    expect(b.width).toBeCloseTo(0.6, 9);
    expect(b.height).toBeCloseTo(0.7, 9);
  });

  it("reads face height as a fraction of the frame", () => {
    // The synthetic oval spans 0.3 above and below centre.
    expect(faceHeightFraction(face)).toBeCloseTo(0.6, 1);
  });

  it("measures interocular distance", () => {
    expect(eyeDistance(face)).toBeGreaterThan(0.2);
    expect(eyeDistance(face)).toBeLessThan(0.35);
  });
});

describe("disc sampling", () => {
  const image = makeImage(SKIN);

  it("covers roughly the area of a circle", () => {
    const r = 0.1;
    const pixels = discPixels(image, { x: 0.5, y: 0.5 }, r);
    const expected = Math.PI * (r * W) ** 2;
    expect(pixels.length).toBeGreaterThan(expected * 0.9);
    expect(pixels.length).toBeLessThan(expected * 1.1);
  });

  it("stays inside the image at the edges", () => {
    const pixels = discPixels(image, { x: 0, y: 0 }, 0.2);
    expect(pixels.length).toBeGreaterThan(0);
    for (const p of pixels) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(W);
      expect(p.y).toBeLessThan(H);
    }
  });

  it("returns nothing for a NaN centre or a zero radius", () => {
    expect(discPixels(image, { x: NaN, y: 0.5 }, 0.1)).toHaveLength(0);
    expect(discPixels(image, { x: 0.5, y: 0.5 }, 0)).toHaveLength(0);
  });

  it("reads pixels and rejects fully transparent ones", () => {
    expect(pixelAt(image, 10, 10)).toEqual(SKIN);
    expect(pixelAt(image, -1, 0)).toBeNull();
    expect(pixelAt(image, W, 0)).toBeNull();

    const transparent = makeImage(SKIN);
    transparent.data[3] = 0;
    expect(pixelAt(transparent, 0, 0)).toBeNull();
  });
});

describe("shadow and highlight trimming", () => {
  it("drops the extremes at both ends", () => {
    const samples = Array.from({ length: 20 }, (_, i) => ({ luminance: i / 19 }));
    const kept = trimLuminanceExtremes(samples, 0.2);
    expect(kept).toHaveLength(12);
    expect(Math.min(...kept.map((k) => k.luminance))).toBeGreaterThan(0);
    expect(Math.max(...kept.map((k) => k.luminance))).toBeLessThan(1);
  });

  it("leaves small sets alone rather than emptying them", () => {
    const tiny = [{ luminance: 0 }, { luminance: 1 }];
    expect(trimLuminanceExtremes(tiny, 0.2)).toHaveLength(2);
  });

  it("orders luminance as expected", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminance({ r: 0, g: 255, b: 0 })).toBeGreaterThan(
      relativeLuminance({ r: 0, g: 0, b: 255 })
    );
  });
});

describe("skin exclusion zones", () => {
  const face = makeFace();
  const image = makeImage(SKIN);
  const zones = skinExclusionZones(face, eyeDistance(face));

  it("covers brows, eyes and lips", () => {
    expect(zones).toHaveLength(5);
  });

  it("excludes a pixel at the lip centre but not at the cheek", () => {
    const lips = centroid(face, LANDMARKS.lips);
    const cheek = centroid(face, LANDMARKS.leftCheek);
    expect(isExcluded(image, Math.round(lips.x * W), Math.round(lips.y * H), zones)).toBe(true);
    expect(isExcluded(image, Math.round(cheek.x * W), Math.round(cheek.y * H), zones)).toBe(false);
  });

  it("drops zones whose landmarks are missing", () => {
    expect(skinExclusionZones([], 0.2)).toHaveLength(0);
  });
});

describe("region extraction", () => {
  const face = makeFace();
  const allSkin = new Uint8Array(W * H).fill(SEGMENT_CLASS.faceSkin);

  it("collects skin from the cheeks and forehead", () => {
    const region = extractSkin(makeImage(SKIN), face, allSkin);
    expect(region.unavailable).toBeUndefined();
    expect(region.count).toBeGreaterThan(1500);
    expect(region.pixels[0].L).toBeGreaterThan(0);
  });

  it("honours the segmentation gate", () => {
    // Nothing is classed face-skin, so nothing may be sampled.
    const noSkin = new Uint8Array(W * H).fill(SEGMENT_CLASS.background);
    const region = extractSkin(makeImage(SKIN), face, noSkin);
    expect(region.count).toBe(0);
    expect(region.unavailable).toBe("not-found");
  });

  it("rejects a specular highlight painted across the cheek", () => {
    const cheek = centroid(face, LANDMARKS.leftCheek);
    const cx = cheek.x * W;
    const cy = cheek.y * H;
    const withGlare = makeImage(SKIN, (x, y) =>
      Math.hypot(x - cx, y - cy) < 6 ? { r: 255, g: 255, b: 255 } : SKIN
    );
    const region = extractSkin(withGlare, face, allSkin);
    // Folded rather than spread: the skin region is the whole face mask now,
    // which is tens of thousands of pixels — more than the argument limit.
    const brightest = region.pixels.reduce((max, p) => (p.L > max ? p.L : max), 0);
    expect(brightest).toBeLessThan(99);
  });

  /**
   * The case that matters: hair hidden by a hijab, a hat or a tight crop must
   * report unavailable, never a measurement. A zero would read as black hair.
   */
  it("marks hair unavailable when the mask contains none", () => {
    const noHair = new Uint8Array(W * H).fill(SEGMENT_CLASS.background);
    const region = extractHair(makeImage(SKIN), noHair);
    expect(region.count).toBe(0);
    expect(region.unavailable).toBe("not-found");
    expect(region.pixels).toHaveLength(0);
  });

  it("marks hair unavailable when there is no mask at all", () => {
    expect(extractHair(makeImage(SKIN), null).unavailable).toBe("not-found");
  });

  it("flags a hair mask too small to trust", () => {
    const sliver = new Uint8Array(W * H).fill(SEGMENT_CLASS.background);
    for (let i = 0; i < 40; i++) sliver[i] = SEGMENT_CLASS.hair;
    const region = extractHair(makeImage({ r: 40, g: 30, b: 25 }), sliver);
    expect(region.unavailable).toBe("too-few-pixels");
  });

  it("collects hair when the mask has it", () => {
    const mask = new Uint8Array(W * H).fill(SEGMENT_CLASS.background);
    for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) mask[y * W + x] = SEGMENT_CLASS.hair;
    const region = extractHair(makeImage({ r: 45, g: 35, b: 30 }), mask);
    expect(region.count).toBeGreaterThan(0);
    expect(region.unavailable).toBeUndefined();
  });

  it("samples both irises", () => {
    const region = extractEyes(makeImage({ r: 90, g: 110, b: 130 }), face);
    expect(region.count).toBeGreaterThan(0);
  });

  it("samples lips", () => {
    const region = extractLips(makeImage({ r: 170, g: 90, b: 95 }), face);
    expect(region.count).toBeGreaterThan(0);
  });

  it("reports coverage per region so bad segmentation is visible", () => {
    const coverage = regionCoverage({
      skin: extractSkin(makeImage(SKIN), face, allSkin),
      hair: extractHair(makeImage(SKIN), null),
      eyes: extractEyes(makeImage(SKIN), face),
      lips: extractLips(makeImage(SKIN), face),
    });
    expect(coverage.skin).toBeGreaterThan(0);
    expect(coverage.hair).toBe(0);
    expect(Object.keys(coverage).sort()).toEqual(["eyes", "hair", "lips", "skin"]);
  });
});

describe("quality metrics", () => {
  function plane(w: number, h: number, f: (x: number, y: number) => number) {
    const gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = f(x, y);
    return gray;
  }

  it("gives a flat image no Laplacian variance", () => {
    expect(laplacianVariance(plane(20, 20, () => 128), 20, 20)).toBeCloseTo(0, 6);
  });

  it("gives a sharp checkerboard high variance", () => {
    const checker = plane(20, 20, (x, y) => ((x + y) % 2 ? 255 : 0));
    expect(laplacianVariance(checker, 20, 20)).toBeGreaterThan(1000);
  });

  it("ranks a blurred edge below a sharp one", () => {
    const sharp = plane(20, 20, (x) => (x < 10 ? 0 : 255));
    const blurred = plane(20, 20, (x) => Math.min(255, Math.max(0, (x - 6) * 32)));
    expect(laplacianVariance(sharp, 20, 20)).toBeGreaterThan(
      laplacianVariance(blurred, 20, 20)
    );
  });

  it("returns 0 for a patch too small to convolve", () => {
    expect(laplacianVariance(plane(2, 2, () => 1), 2, 2)).toBe(0);
  });

  it("counts clipping at both ends", () => {
    expect(clippedFraction([0, 128, 255, 128], 6, 250)).toBeCloseTo(0.5, 9);
    expect(clippedFraction([128, 130, 140], 6, 250)).toBe(0);
    expect(clippedFraction([], 6, 250)).toBe(0);
  });

  it("reads no cast off a neutral sclera", () => {
    const neutral: RGB[] = Array.from({ length: 50 }, () => ({ r: 230, g: 230, b: 230 }));
    expect(scleraCast(neutral)!).toBeLessThan(1);
  });

  it("reads a warm cast off a yellowed sclera", () => {
    const warm: RGB[] = Array.from({ length: 50 }, () => ({ r: 240, g: 225, b: 180 }));
    expect(scleraCast(warm)!).toBeGreaterThan(8);
  });

  it("declines to judge a cast from too few pixels", () => {
    expect(scleraCast([{ r: 230, g: 230, b: 230 }])).toBeNull();
  });

  it("separates smoothed skin from detailed skin", () => {
    const detailed = plane(30, 30, (x, y) => 128 + (((x * 7 + y * 13) % 11) - 5) * 4);
    const smoothed = plane(30, 30, () => 128);
    expect(detailEnergy(detailed, 30, 30)).toBeGreaterThan(
      detailEnergy(smoothed, 30, 30)
    );
    expect(detailEnergy(smoothed, 30, 30)).toBeCloseTo(0, 6);
  });

  it("clips a gray patch to the image bounds", () => {
    const image = makeImage(SKIN);
    const patch = grayPatch(image, W - 5, H - 5, 20, 20);
    expect(patch.width).toBe(5);
    expect(patch.height).toBe(5);
    expect(patch.gray).toHaveLength(25);
  });
});
