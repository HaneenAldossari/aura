/**
 * Regions in, MeasuredFeatures out.
 *
 * This is the seam between "what pixels did we collect" and "what does the
 * scorer see". It is also where an unusable region becomes `null` rather than a
 * number, which is the single most important property in the file: a hair
 * region reported as zero reads as black hair and drags every face toward Deep.
 */

import {
  labToLch,
  median,
  trimmedMean,
  type Gamut,
  type Lab,
  type LCh,
} from "./color";
import type { AllRegions, RegionName, RegionPixels } from "./regions";
import type { WhiteBalanceMethod } from "./color";
import { SPECULAR } from "./seasons.config";
import type { HairStatus } from "./seasons.config";
import type { MeasuredFeatures, RegionStats } from "./score";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Everything measured about one region, for display and for the eval. */
export interface RegionFeature extends RegionStats {
  /** Lab median — the reported statistic. */
  lab: Lab;
  /** Trimmed mean, carried alongside so the eval can compare the two. */
  trimmedLab: Lab;
  pixelCount: number;
  /** Set when the region is not trustworthy; the stats are then indicative only. */
  unavailable?: string;
}

export interface ContrastFeature {
  /** Range of L\* across usable features: lightest minus darkest. */
  range: number | null;
  /** Δ L\* hair minus skin. Null when hair is unusable. */
  hairSkin: number | null;
  /** Δ L\* eyes minus skin. */
  eyesSkin: number | null;
}

/**
 * The full measurement record.
 *
 * `forScoring` is the subset score() consumes; everything else is here so the
 * eval, the LLM prompt and the UI can see what was actually measured rather
 * than only the verdict.
 */
export interface Features {
  skin: RegionFeature | null;
  hair: RegionFeature | null;
  eyes: RegionFeature | null;
  lips: RegionFeature | null;
  contrast: ContrastFeature;
  /** Pixels accepted per region, so a bad segmentation is visible. */
  coverage: Record<RegionName, number>;
  hairStatus: HairStatus;
  /** Which gamut the pixels were interpreted as. "assumed-srgb" is a caveat. */
  gamut: Gamut;
  whiteBalance: { method: WhiteBalanceMethod } | null;
  /** Ready to hand to score(). */
  forScoring: MeasuredFeatures;
}

export interface FeatureOptions {
  hairStatus?: HairStatus;
  gamut?: Gamut;
  whiteBalanceMethod?: WhiteBalanceMethod;
  /** Proportion trimmed from each end for the trimmed-mean statistic. */
  trim?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-region statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The diffuse pixels of a region, as a slice of its L* range.
 *
 * Sorting by L* and keeping a low band drops the specular highlight at the top
 * and the shadow at the bottom. The cheekbone and mid-forehead patches this
 * samples are exactly where studio lighting puts its highlights, so the top of
 * the range is reliably the light source rather than the person.
 */
export function diffusePixels(pixels: Lab[]): Lab[] {
  if (pixels.length < 8) return pixels;
  const sorted = pixels.slice().sort((p, q) => p.L - q.L);
  const from = Math.floor(sorted.length * SPECULAR.diffuseBand.lo);
  const to = Math.max(Math.floor(sorted.length * SPECULAR.diffuseBand.hi), from + 1);
  return sorted.slice(from, to);
}

function statsFor(region: RegionPixels, trim: number): RegionFeature | null {
  // An unusable region is null, never a number. See the file header.
  if (region.unavailable || region.pixels.length === 0) return null;

  // Componentwise medians are taken over the SAME subset of pixels, not over
  // the region independently per channel. Three independent medians describe a
  // colour no pixel in the patch actually had, which is a strange thing to feed
  // a classifier that reasons about hue.
  const diffuse = diffusePixels(region.pixels);
  const Ls = diffuse.map((p) => p.L);
  const as = diffuse.map((p) => p.a);
  const bs = diffuse.map((p) => p.b);

  const lab: Lab = { L: median(Ls), a: median(as), b: median(bs) };
  const trimmedLab: Lab = {
    L: trimmedMean(region.pixels.map((p) => p.L), trim),
    a: trimmedMean(region.pixels.map((p) => p.a), trim),
    b: trimmedMean(region.pixels.map((p) => p.b), trim),
  };
  const lch: LCh = labToLch(lab);

  return {
    L: lch.L,
    C: lch.C,
    h: lch.h,
    lab,
    trimmedLab,
    pixelCount: region.count,
  };
}

/**
 * Same as statsFor, but keeps the numbers and marks them unavailable.
 *
 * Used for display only — the caller sees what was measured and why it is not
 * being trusted, instead of an empty box with no explanation.
 */
function indicativeStats(region: RegionPixels, trim: number): RegionFeature | null {
  if (region.pixels.length === 0) return null;
  const base = statsFor({ ...region, unavailable: undefined }, trim);
  return base ? { ...base, unavailable: region.unavailable } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrast
// ─────────────────────────────────────────────────────────────────────────────

function contrastFrom(
  skin: RegionFeature | null,
  hair: RegionFeature | null,
  eyes: RegionFeature | null,
  hairUsable: boolean
): ContrastFeature {
  if (!skin) return { range: null, hairSkin: null, eyesSkin: null };

  const levels = [skin.L];
  if (hairUsable && hair) levels.push(hair.L);
  if (eyes) levels.push(eyes.L);

  return {
    // Range, not a mean of pairwise deltas. See CONTRAST in seasons.config.ts.
    range: levels.length < 2 ? null : Math.max(...levels) - Math.min(...levels),
    hairSkin: hairUsable && hair ? hair.L - skin.L : null,
    eyesSkin: eyes ? eyes.L - skin.L : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

/** Strip the display-only fields down to what score() accepts. */
function toRegionStats(feature: RegionFeature | null): RegionStats | null {
  return feature ? { L: feature.L, C: feature.C, h: feature.h } : null;
}

/**
 * Turn extracted regions into features.
 *
 * Skin is required — without it there is nothing to classify — so this throws
 * when skin is unavailable. Everything else degrades: score() redistributes the
 * weight of whatever is missing.
 */
export function buildFeatures(
  regions: AllRegions,
  options: FeatureOptions = {}
): Features {
  const trim = options.trim ?? 0.2;
  const hairStatus = options.hairStatus ?? "natural";

  const skin = statsFor(regions.skin, trim);
  const eyes = statsFor(regions.eyes, trim);
  const lips = statsFor(regions.lips, trim);

  // Hair is kept for display even when it will not be scored, so the UI can say
  // "we saw this, we're not using it" rather than showing nothing.
  const hairUsable = hairStatus === "natural" && !regions.hair.unavailable;
  const hair = hairUsable
    ? statsFor(regions.hair, trim)
    : indicativeStats(regions.hair, trim);

  if (!skin) {
    throw new Error(
      `Cannot build features: skin region is ${regions.skin.unavailable ?? "empty"}. ` +
        `Nothing can be classified without it.`
    );
  }

  const contrast = contrastFrom(skin, hair, eyes, hairUsable);

  return {
    skin,
    hair,
    eyes,
    lips,
    contrast,
    coverage: {
      skin: regions.skin.count,
      hair: regions.hair.count,
      eyes: regions.eyes.count,
      lips: regions.lips.count,
    },
    hairStatus,
    gamut: options.gamut ?? "srgb",
    whiteBalance: options.whiteBalanceMethod
      ? { method: options.whiteBalanceMethod }
      : null,
    forScoring: {
      skin: { L: skin.L, C: skin.C, h: skin.h },
      // score() applies hairStatus itself, but passing an unusable region's
      // numbers through would be misleading, so null it here too.
      hair: hairUsable ? toRegionStats(hair) : null,
      eyes: toRegionStats(eyes),
      hairStatus,
    },
  };
}

/**
 * Average two measurements in Lab.
 *
 * Phase 2 asks for a second photo in different light when the call is
 * ambiguous; this is how the two are combined. Averaging happens in Lab, not on
 * L/C/h — hue is circular, and the mean of 350 degrees and 10 degrees is 180,
 * which is the opposite colour.
 */
export function averageFeatures(a: Features, b: Features): Features {
  const meanLab = (x: Lab, y: Lab): Lab => ({
    L: (x.L + y.L) / 2,
    a: (x.a + y.a) / 2,
    b: (x.b + y.b) / 2,
  });

  const merge = (
    p: RegionFeature | null,
    q: RegionFeature | null
  ): RegionFeature | null => {
    if (!p) return q;
    if (!q) return p;
    const lab = meanLab(p.lab, q.lab);
    const lch = labToLch(lab);
    return {
      L: lch.L,
      C: lch.C,
      h: lch.h,
      lab,
      trimmedLab: meanLab(p.trimmedLab, q.trimmedLab),
      pixelCount: p.pixelCount + q.pixelCount,
      unavailable: p.unavailable ?? q.unavailable,
    };
  };

  const skin = merge(a.skin, b.skin)!;
  const hair = merge(a.hair, b.hair);
  const eyes = merge(a.eyes, b.eyes);
  const lips = merge(a.lips, b.lips);

  // The stricter of the two statuses wins: if either photo showed dyed or
  // covered hair, the hair is not evidence of natural colouring.
  const hairStatus: HairStatus =
    a.hairStatus === "natural" && b.hairStatus === "natural" ? "natural" : "covered";
  const hairUsable = hairStatus === "natural" && !hair?.unavailable;

  return {
    skin,
    hair,
    eyes,
    lips,
    contrast: contrastFrom(skin, hair, eyes, hairUsable),
    coverage: {
      skin: a.coverage.skin + b.coverage.skin,
      hair: a.coverage.hair + b.coverage.hair,
      eyes: a.coverage.eyes + b.coverage.eyes,
      lips: a.coverage.lips + b.coverage.lips,
    },
    hairStatus,
    gamut: a.gamut === b.gamut ? a.gamut : "assumed-srgb",
    whiteBalance: a.whiteBalance,
    forScoring: {
      skin: { L: skin.L, C: skin.C, h: skin.h },
      hair: hairUsable ? toRegionStats(hair) : null,
      eyes: toRegionStats(eyes),
      hairStatus,
    },
  };
}
