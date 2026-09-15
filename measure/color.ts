/**
 * Colour space conversion and robust statistics.
 *
 * Pure functions, no DOM. Everything downstream measures in CIE Lab (D65), so
 * this is the only place that knows about encodings, transfer curves or
 * primaries.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Non-linear channel values, 0-255. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Linear-light channel values, 0-1. */
export interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** Lab in cylindrical form: lightness, chroma, hue angle in degrees. */
export interface LCh {
  L: number;
  C: number;
  h: number;
}

/**
 * Which set of primaries the decoded pixels are in.
 *
 * WASM decoders return raw channel values and do not apply the embedded ICC
 * profile, so this has to be tracked explicitly. Treating Display P3 values as
 * sRGB shifts skin hue angle — the exact axis a season turns on.
 */
export type Gamut = "srgb" | "display-p3" | "assumed-srgb";

// ─────────────────────────────────────────────────────────────────────────────
// Transfer curve
// ─────────────────────────────────────────────────────────────────────────────

/**
 * sRGB electro-optical transfer function, 0-255 in, linear 0-1 out.
 * Display P3 shares this curve; only the primaries differ.
 */
export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Inverse of srgbToLinear. Linear 0-1 in, 0-255 out. */
export function linearToSrgb(linear: number): number {
  const c =
    linear <= 0.0031308
      ? linear * 12.92
      : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return c * 255;
}

export function toLinear(rgb: RGB): LinearRGB {
  return {
    r: srgbToLinear(rgb.r),
    g: srgbToLinear(rgb.g),
    b: srgbToLinear(rgb.b),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Primaries
// ─────────────────────────────────────────────────────────────────────────────

/** Linear sRGB to XYZ, D65 white point. */
const SRGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
] as const;

/** Linear Display P3 to XYZ, D65 white point. Same transfer curve, wider gamut. */
const P3_TO_XYZ = [
  [0.4865709, 0.2656677, 0.1982173],
  [0.2289746, 0.6917385, 0.0792869],
  [0.0, 0.0451134, 1.0439444],
] as const;

/** D65 reference white, Y normalised to 1. */
export const D65 = { x: 0.95047, y: 1.0, z: 1.08883 } as const;

function matrixApply(m: readonly (readonly number[])[], v: LinearRGB): XYZ {
  return {
    x: m[0][0] * v.r + m[0][1] * v.g + m[0][2] * v.b,
    y: m[1][0] * v.r + m[1][1] * v.g + m[1][2] * v.b,
    z: m[2][0] * v.r + m[2][1] * v.g + m[2][2] * v.b,
  };
}

export function linearToXyz(linear: LinearRGB, gamut: Gamut = "srgb"): XYZ {
  return matrixApply(gamut === "display-p3" ? P3_TO_XYZ : SRGB_TO_XYZ, linear);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lab
// ─────────────────────────────────────────────────────────────────────────────

const DELTA = 6 / 29;
const DELTA_CUBED = DELTA * DELTA * DELTA;

function labF(t: number): number {
  return t > DELTA_CUBED ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29;
}

export function xyzToLab(xyz: XYZ): Lab {
  const fx = labF(xyz.x / D65.x);
  const fy = labF(xyz.y / D65.y);
  const fz = labF(xyz.z / D65.z);
  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/** Full pipeline: encoded RGB to CIE Lab D65. */
export function rgbToLab(rgb: RGB, gamut: Gamut = "srgb"): Lab {
  return xyzToLab(linearToXyz(toLinear(rgb), gamut));
}

export function labToLch(lab: Lab): LCh {
  const C = Math.hypot(lab.a, lab.b);
  let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L: lab.L, C, h };
}

export function rgbToLch(rgb: RGB, gamut: Gamut = "srgb"): LCh {
  return labToLch(rgbToLab(rgb, gamut));
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust statistics
// ─────────────────────────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Mean after discarding `proportion` of the values from each end.
 *
 * Skin regions carry specular highlights and shadow, both of which are extreme
 * and neither of which is skin colour. Trimming removes them without the
 * information loss of a plain median.
 */
export function trimmedMean(values: number[], proportion = 0.2): number {
  if (values.length === 0) return NaN;
  if (proportion <= 0) return values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * proportion);
  const kept = sorted.slice(cut, sorted.length - cut);
  const use = kept.length > 0 ? kept : sorted;
  return use.reduce((a, b) => a + b, 0) / use.length;
}

/** Median and trimmed mean of each Lab channel across a region's pixels. */
export interface RegionColor {
  median: Lab;
  trimmedMean: Lab;
  lch: LCh;
  pixelCount: number;
}

export function summariseRegion(pixels: Lab[], proportion = 0.2): RegionColor {
  const Ls = pixels.map((p) => p.L);
  const as = pixels.map((p) => p.a);
  const bs = pixels.map((p) => p.b);
  const med: Lab = { L: median(Ls), a: median(as), b: median(bs) };
  const trimmed: Lab = {
    L: trimmedMean(Ls, proportion),
    a: trimmedMean(as, proportion),
    b: trimmedMean(bs, proportion),
  };
  // The median is the reported statistic: it is the more robust of the two, and
  // the trimmed mean is carried alongside so the eval can compare them.
  return { median: med, trimmedMean: trimmed, lch: labToLch(med), pixelCount: pixels.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// White balance
// ─────────────────────────────────────────────────────────────────────────────

export type WhiteBalanceMethod = "gray-card" | "sclera" | "gray-world" | "none";

export interface WhiteBalance {
  method: WhiteBalanceMethod;
  /** Per-channel multipliers applied to linear-light values. */
  gains: LinearRGB;
}

/**
 * Von Kries-style correction: scale each linear channel so the supplied
 * reference becomes neutral, preserving overall luminance.
 *
 * Preference order is gray card, then sclera, then gray-world. A gray card is a
 * known neutral; the sclera is approximately neutral and is at least on the same
 * face under the same light; gray-world is the last resort and is wrong whenever
 * the frame is dominated by one colour.
 */
export function whiteBalanceGains(
  reference: LinearRGB,
  method: WhiteBalanceMethod
): WhiteBalance {
  if (method === "none") {
    return { method, gains: { r: 1, g: 1, b: 1 } };
  }
  const mean = (reference.r + reference.g + reference.b) / 3;
  const safe = (c: number) => (c > 1e-6 ? mean / c : 1);
  return {
    method,
    gains: { r: safe(reference.r), g: safe(reference.g), b: safe(reference.b) },
  };
}

export function applyGains(linear: LinearRGB, gains: LinearRGB): LinearRGB {
  return {
    r: linear.r * gains.r,
    g: linear.g * gains.g,
    b: linear.b * gains.b,
  };
}

/** Mean linear-light colour of a set of encoded pixels. */
export function meanLinear(pixels: RGB[]): LinearRGB {
  if (pixels.length === 0) return { r: 0, g: 0, b: 0 };
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of pixels) {
    r += srgbToLinear(p.r);
    g += srgbToLinear(p.g);
    b += srgbToLinear(p.b);
  }
  const n = pixels.length;
  return { r: r / n, g: g / n, b: b / n };
}

/** CIE76 colour difference. Adequate for the gross comparisons here. */
export function deltaE76(a: Lab, b: Lab): number {
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}
