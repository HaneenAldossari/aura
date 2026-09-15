/**
 * Region extraction: which pixels are skin, hair, iris and lips.
 *
 * Sampling strategy is discs, not polygon fills. A disc centred on a landmark
 * centroid and scaled by interocular distance is robust to the exact index set
 * being slightly off, and it keeps sampling away from region edges where the
 * segmentation and the mesh disagree most.
 *
 * Skin is the region that needs the most care: shadows, specular highlights,
 * brows and the hairline all sit inside a naive cheek patch and none of them is
 * skin colour. Each is excluded explicitly and counted, so a patch that loses
 * most of its pixels is visible rather than silently thin.
 */

import { srgbToLinear, type Lab, type RGB } from "./color";
import { rgbToLab, type Gamut } from "./color";
import {
  LANDMARKS,
  SEGMENT_CLASS,
  centroid,
  eyeDistance,
  type Landmark,
  type Point,
} from "./landmarks";
import { SCORING } from "./seasons.config";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RegionName = "skin" | "hair" | "eyes" | "lips";

export interface RegionPixels {
  name: RegionName;
  /** Lab values of the accepted pixels. */
  pixels: Lab[];
  /** How many pixels survived every exclusion. */
  count: number;
  /** How many were looked at before exclusions. */
  considered: number;
  /**
   * Set when the region cannot be trusted. Downstream code must treat this as
   * absent rather than as a measurement of zero — a hair region reported as
   * zero reads as black hair and drags every face toward Deep.
   */
  unavailable?: "not-found" | "too-few-pixels";
}

export interface RegionOptions {
  gamut?: Gamut;
  /** Proportion of the luminance distribution trimmed from each end. */
  shadowHighlightTrim?: number;
}

export interface ImageLike {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sampling primitives (pure)
// ─────────────────────────────────────────────────────────────────────────────

/** Relative luminance of an encoded pixel, 0-1. Used for shadow/highlight cuts. */
export function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

export function pixelAt(image: ImageLike, x: number, y: number): RGB | null {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return null;
  const i = (y * image.width + x) * 4;
  // Fully transparent pixels carry no colour information.
  if (image.data[i + 3] === 0) return null;
  return { r: image.data[i], g: image.data[i + 1], b: image.data[i + 2] };
}

/** Integer pixel coordinates inside a disc, clipped to the image. */
export function discPixels(
  image: ImageLike,
  centre: Point,
  radiusFraction: number
): { x: number; y: number }[] {
  const cx = centre.x * image.width;
  const cy = centre.y * image.height;
  // Radius is expressed relative to image width so it stays isotropic.
  const r = radiusFraction * image.width;
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !(r > 0)) return [];

  const out: { x: number; y: number }[] = [];
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(image.width - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(image.height - 1, Math.ceil(cy + r));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) out.push({ x, y });
    }
  }
  return out;
}

/**
 * Drop the darkest and brightest `trim` of a set by luminance.
 *
 * This is what removes shadow and specular highlight from a skin patch. It runs
 * on luminance rather than on each Lab channel independently, so a pixel is
 * kept or dropped as a whole rather than having its channels mixed from
 * different pixels.
 */
export function trimLuminanceExtremes<T extends { luminance: number }>(
  samples: T[],
  trim: number
): T[] {
  if (trim <= 0 || samples.length < 5) return samples;
  const sorted = [...samples].sort((a, b) => a.luminance - b.luminance);
  const cut = Math.floor(sorted.length * trim);
  const kept = sorted.slice(cut, sorted.length - cut);
  return kept.length > 0 ? kept : sorted;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exclusion zones
// ─────────────────────────────────────────────────────────────────────────────

export interface ExclusionZone {
  centre: Point;
  radiusFraction: number;
}

/** Zones a skin sample must avoid: brows, eyes and lips. */
export function skinExclusionZones(
  landmarks: Landmark[],
  scale: number
): ExclusionZone[] {
  return [
    { centre: centroid(landmarks, LANDMARKS.leftBrow), radiusFraction: scale * 0.45 },
    { centre: centroid(landmarks, LANDMARKS.rightBrow), radiusFraction: scale * 0.45 },
    { centre: centroid(landmarks, LANDMARKS.leftEye), radiusFraction: scale * 0.5 },
    { centre: centroid(landmarks, LANDMARKS.rightEye), radiusFraction: scale * 0.5 },
    { centre: centroid(landmarks, LANDMARKS.lips), radiusFraction: scale * 0.55 },
  ].filter((z) => Number.isFinite(z.centre.x) && Number.isFinite(z.centre.y));
}

export function isExcluded(
  image: ImageLike,
  x: number,
  y: number,
  zones: ExclusionZone[]
): boolean {
  const nx = (x + 0.5) / image.width;
  const ny = (y + 0.5) / image.height;
  for (const zone of zones) {
    const dx = (nx - zone.centre.x) * image.width;
    const dy = (ny - zone.centre.y) * image.height;
    const r = zone.radiusFraction * image.width;
    if (dx * dx + dy * dy <= r * r) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Region extraction
// ─────────────────────────────────────────────────────────────────────────────

interface Sample {
  lab: Lab;
  luminance: number;
}

function collect(
  image: ImageLike,
  coords: { x: number; y: number }[],
  gamut: Gamut,
  accept: (x: number, y: number, rgb: RGB) => boolean
): Sample[] {
  const out: Sample[] = [];
  for (const { x, y } of coords) {
    const rgb = pixelAt(image, x, y);
    if (!rgb || !accept(x, y, rgb)) continue;
    out.push({ lab: rgbToLab(rgb, gamut), luminance: relativeLuminance(rgb) });
  }
  return out;
}

function finish(
  name: RegionName,
  samples: Sample[],
  considered: number,
  trim: number,
  minPixels: number
): RegionPixels {
  const kept = trimLuminanceExtremes(samples, trim);
  const region: RegionPixels = {
    name,
    pixels: kept.map((s) => s.lab),
    count: kept.length,
    considered,
  };
  if (kept.length === 0) region.unavailable = "not-found";
  else if (kept.length < minPixels) region.unavailable = "too-few-pixels";
  return region;
}

/**
 * Skin: both cheeks and the lower forehead.
 *
 * The segmentation mask is used as a gate when available — a pixel must be
 * classed face-skin — which is what keeps a cheek patch off a hand, a collar or
 * a strand of hair crossing the face.
 */
export function extractSkin(
  image: ImageLike,
  landmarks: Landmark[],
  segmentation: Uint8Array | null,
  options: RegionOptions = {}
): RegionPixels {
  const gamut = options.gamut ?? "srgb";
  const trim = options.shadowHighlightTrim ?? 0.2;
  const scale = eyeDistance(landmarks);
  const zones = skinExclusionZones(landmarks, scale);

  const patches: Point[] = [
    centroid(landmarks, LANDMARKS.leftCheek),
    centroid(landmarks, LANDMARKS.rightCheek),
    centroid(landmarks, LANDMARKS.forehead),
  ];

  let considered = 0;
  const samples: Sample[] = [];
  for (const patch of patches) {
    const coords = discPixels(image, patch, scale * 0.22);
    considered += coords.length;
    samples.push(
      ...collect(image, coords, gamut, (x, y) => {
        if (isExcluded(image, x, y, zones)) return false;
        if (segmentation) {
          const cls = segmentation[y * image.width + x];
          // face-skin only: body-skin would admit neck and chest, which sit in
          // different light and are often a different tone.
          if (cls !== SEGMENT_CLASS.faceSkin) return false;
        }
        return true;
      })
    );
  }

  return finish("skin", samples, considered, trim, SCORING.minRegionPixels.skin);
}

/**
 * Hair: taken entirely from the segmentation mask, since the face mesh has no
 * hair landmarks. Without a mask there is no hair region at all — which is the
 * honest answer, not a reason to guess from pixels above the forehead.
 */
export function extractHair(
  image: ImageLike,
  segmentation: Uint8Array | null,
  options: RegionOptions = {}
): RegionPixels {
  if (!segmentation) {
    return { name: "hair", pixels: [], count: 0, considered: 0, unavailable: "not-found" };
  }
  const gamut = options.gamut ?? "srgb";
  const trim = options.shadowHighlightTrim ?? 0.2;

  // Hair occupies a large area; sampling every pixel is wasteful on a 24 MP
  // photo, so step through it.
  const step = Math.max(1, Math.floor(Math.min(image.width, image.height) / 400));
  const coords: { x: number; y: number }[] = [];
  for (let y = 0; y < image.height; y += step) {
    for (let x = 0; x < image.width; x += step) {
      if (segmentation[y * image.width + x] === SEGMENT_CLASS.hair) coords.push({ x, y });
    }
  }

  const samples = collect(image, coords, gamut, () => true);
  return finish("hair", samples, coords.length, trim, SCORING.minRegionPixels.hair);
}

/**
 * Irises. Sampled from the five iris landmarks of each eye.
 *
 * Trimming matters more here than anywhere: the catchlight — the reflection of
 * the light source — sits in the middle of the iris and is pure light-source
 * colour, not eye colour.
 */
export function extractEyes(
  image: ImageLike,
  landmarks: Landmark[],
  options: RegionOptions = {}
): RegionPixels {
  const gamut = options.gamut ?? "srgb";
  const scale = eyeDistance(landmarks);
  const considered: { x: number; y: number }[] = [];

  for (const indices of [LANDMARKS.leftIris, LANDMARKS.rightIris]) {
    const centre = centroid(landmarks, indices);
    if (!Number.isFinite(centre.x)) continue;
    considered.push(...discPixels(image, centre, scale * 0.055));
  }

  const samples = collect(image, considered, gamut, () => true);
  // A harder trim than skin: the catchlight is small, bright and always present.
  return finish("eyes", samples, considered.length, 0.3, SCORING.minRegionPixels.eyes);
}

/** Lips, from the outer lip contour's centroid. */
export function extractLips(
  image: ImageLike,
  landmarks: Landmark[],
  options: RegionOptions = {}
): RegionPixels {
  const gamut = options.gamut ?? "srgb";
  const trim = options.shadowHighlightTrim ?? 0.2;
  const scale = eyeDistance(landmarks);
  const centre = centroid(landmarks, LANDMARKS.lips);
  const coords = discPixels(image, centre, scale * 0.12);
  const samples = collect(image, coords, gamut, () => true);
  return finish("lips", samples, coords.length, trim, SCORING.minRegionPixels.lips);
}

export interface AllRegions {
  skin: RegionPixels;
  hair: RegionPixels;
  eyes: RegionPixels;
  lips: RegionPixels;
}

export function extractRegions(
  image: ImageLike,
  landmarks: Landmark[],
  segmentation: Uint8Array | null,
  options: RegionOptions = {}
): AllRegions {
  return {
    skin: extractSkin(image, landmarks, segmentation, options),
    hair: extractHair(image, segmentation, options),
    eyes: extractEyes(image, landmarks, options),
    lips: extractLips(image, landmarks, options),
  };
}

/** Pixel counts per region, so a bad segmentation is detectable downstream. */
export function regionCoverage(regions: AllRegions): Record<RegionName, number> {
  return {
    skin: regions.skin.count,
    hair: regions.hair.count,
    eyes: regions.eyes.count,
    lips: regions.lips.count,
  };
}
