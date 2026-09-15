/**
 * Dominant colours of a product photo, for "Before You Buy".
 *
 * k-means in Lab, not RGB: k-means minimises Euclidean distance, and Euclidean
 * distance in RGB does not correspond to perceived difference. Two colours a
 * shopper would call the same can be far apart in RGB, and two they would call
 * different can be close. Lab is designed so that distance means what we need
 * it to mean here.
 *
 * Background removal is a largest-central-object heuristic rather than GrabCut:
 * product photos are overwhelmingly a centred item on a plain backdrop, and a
 * border-colour flood is both far cheaper and far easier to reason about than a
 * segmentation model that can fail silently.
 */

import {
  deltaE76,
  labToLch,
  rgbToLab,
  type Gamut,
  type Lab,
  type RGB,
} from "./color";
import { pixelAt, type ImageLike } from "./regions";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** estimate — calibrate in Phase 4, once real product photos exist. */
export const PRODUCT = {
  /** Clusters to fit. The spec asks for 3-5. */
  k: 4,
  /** Longest edge to downsample to before clustering. */
  maxDimension: 256,
  /** k-means iterations. Converges well before this in practice. */
  maxIterations: 24,
  /** Stop when no centroid moves further than this in Lab. */
  convergenceDeltaE: 0.5,
  /**
   * A border pixel within this Lab distance of the sampled background colour is
   * treated as backdrop.
   */
  backgroundDeltaE: 12,
  /** Fraction of the frame sampled from each edge to estimate the backdrop. */
  borderFraction: 0.06,
  /** Drop clusters covering less than this share of the kept pixels. */
  minCoverage: 0.04,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DominantColor {
  lab: Lab;
  hex: string;
  /** Share of the non-background pixels in this cluster, 0-1. */
  coverage: number;
  lch: { L: number; C: number; h: number };
}

export interface ProductColorResult {
  colors: DominantColor[];
  /** How many pixels survived background removal. */
  sampledPixels: number;
  /** Fraction of the image judged to be backdrop. */
  backgroundFraction: number;
  /** False when the backdrop could not be told apart from the product. */
  backgroundRemoved: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/** Lab back to a hex string, via the inverse of the forward transform. */
export function labToHex(lab: Lab): string {
  const fy = (lab.L + 16) / 116;
  const fx = fy + lab.a / 500;
  const fz = fy - lab.b / 200;
  const inv = (t: number) => (t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29));
  const x = 0.95047 * inv(fx);
  const y = 1.0 * inv(fy);
  const z = 1.08883 * inv(fz);

  const lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const lg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  const encode = (c: number) =>
    clamp255((c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055) * 255);

  return `#${[encode(lr), encode(lg), encode(lb)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Median Lab of the image border — the backdrop, in a typical product shot. */
export function estimateBackground(image: ImageLike, gamut: Gamut = "srgb"): Lab | null {
  const bw = Math.max(1, Math.floor(image.width * PRODUCT.borderFraction));
  const bh = Math.max(1, Math.floor(image.height * PRODUCT.borderFraction));
  const samples: Lab[] = [];

  const step = Math.max(1, Math.floor(Math.max(image.width, image.height) / 128));
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const onBorder =
        x < bw || y < bh || x >= image.width - bw || y >= image.height - bh;
      if (!onBorder) continue;
      const rgb = pixelAt(image, x, y);
      if (rgb) samples.push(rgbToLab(rgb, gamut));
    }
  }
  if (samples.length === 0) return null;

  const mid = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[sorted.length >> 1];
  };
  return {
    L: mid(samples.map((s) => s.L)),
    a: mid(samples.map((s) => s.a)),
    b: mid(samples.map((s) => s.b)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// k-means
// ─────────────────────────────────────────────────────────────────────────────

/**
 * k-means++ seeding: pick each new centre with probability proportional to its
 * squared distance from the nearest existing centre. Plain random seeding
 * regularly collapses two centres onto the same colour and loses a real one.
 */
function seed(points: Lab[], k: number, random: () => number): Lab[] {
  const centres: Lab[] = [points[Math.floor(random() * points.length)]];
  while (centres.length < k) {
    const weights = points.map((p) =>
      Math.min(...centres.map((c) => deltaE76(p, c))) ** 2
    );
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) break;
    let target = random() * total;
    let index = 0;
    while (index < weights.length - 1 && (target -= weights[index]) > 0) index++;
    centres.push(points[index]);
  }
  return centres;
}

/** Deterministic PRNG, so the same photo always gives the same clusters. */
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function kMeansLab(
  points: Lab[],
  k: number,
  seedValue = 12
): { centre: Lab; count: number }[] {
  if (points.length === 0) return [];
  const effectiveK = Math.min(k, points.length);
  const random = mulberry32(seedValue);
  let centres = seed(points, effectiveK, random);

  let assignment = new Array<number>(points.length).fill(0);
  for (let iteration = 0; iteration < PRODUCT.maxIterations; iteration++) {
    // Assign.
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = deltaE76(points[i], centres[c]);
        if (d < bestDistance) {
          bestDistance = d;
          best = c;
        }
      }
      assignment[i] = best;
    }

    // Update.
    const sums = centres.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignment[i]];
      s.L += points[i].L;
      s.a += points[i].a;
      s.b += points[i].b;
      s.n++;
    }

    let moved = 0;
    const next = centres.map((centre, c) => {
      const s = sums[c];
      if (s.n === 0) return centre; // keep an empty centre rather than drop it
      const updated: Lab = { L: s.L / s.n, a: s.a / s.n, b: s.b / s.n };
      moved = Math.max(moved, deltaE76(centre, updated));
      return updated;
    });
    centres = next;
    if (moved < PRODUCT.convergenceDeltaE) break;
  }

  const counts = centres.map(() => 0);
  for (const a of assignment) counts[a]++;
  return centres
    .map((centre, i) => ({ centre, count: counts[i] }))
    .filter((c) => c.count > 0)
    .sort((x, y) => y.count - x.count);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dominant colours of a product, backdrop excluded.
 *
 * When background removal would keep almost nothing — a product that fills the
 * frame, or one the same colour as its backdrop — the whole image is used
 * instead and `backgroundRemoved` is false, so the caller knows the result
 * includes backdrop rather than silently scoring a wall.
 */
export function productColors(
  image: ImageLike,
  options: { gamut?: Gamut; k?: number } = {}
): ProductColorResult {
  const gamut = options.gamut ?? "srgb";
  const k = options.k ?? PRODUCT.k;

  const step = Math.max(
    1,
    Math.floor(Math.max(image.width, image.height) / PRODUCT.maxDimension)
  );
  const background = estimateBackground(image, gamut);

  const all: Lab[] = [];
  const foreground: Lab[] = [];
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      const rgb = pixelAt(image, x, y);
      if (!rgb) continue;
      const lab = rgbToLab(rgb, gamut);
      all.push(lab);
      if (!background || deltaE76(lab, background) > PRODUCT.backgroundDeltaE) {
        foreground.push(lab);
      }
    }
  }

  // Too little left to be a product: fall back rather than cluster noise.
  const enough = foreground.length >= Math.max(32, all.length * 0.02);
  const points = enough ? foreground : all;

  const clusters = kMeansLab(points, k);
  const total = clusters.reduce((sum, c) => sum + c.count, 0) || 1;

  const colors: DominantColor[] = clusters
    .map((c) => {
      const lch = labToLch(c.centre);
      return {
        lab: c.centre,
        hex: labToHex(c.centre),
        coverage: c.count / total,
        lch: { L: lch.L, C: lch.C, h: lch.h },
      };
    })
    .filter((c) => c.coverage >= PRODUCT.minCoverage);

  return {
    colors,
    sampledPixels: points.length,
    backgroundFraction: all.length ? 1 - foreground.length / all.length : 0,
    backgroundRemoved: enough && background !== null,
  };
}

/** Convenience for callers holding encoded pixels rather than an image. */
export function dominantFromRgb(pixels: RGB[], k: number = PRODUCT.k, gamut: Gamut = "srgb") {
  return kMeansLab(
    pixels.map((p) => rgbToLab(p, gamut)),
    k
  );
}
