/**
 * Rule-based season ranking.
 *
 * Pure functions over measured features — no DOM, no network, no model. This is
 * the half of classification that is deterministic and testable; the LLM's job
 * is to agree or disagree with it, not to read colour values itself.
 *
 * Every threshold lives in ./seasons.config.ts. Nothing numeric belongs here.
 */
import {
  AXIS_WEIGHTS,
  CHROMA,
  CONTRAST,
  HUE,
  SCORING,
  SEASONS,
  SEASON_PROFILES,
  SKIN_BANDS,
  VALUE,
  flowNeighbours,
  type Axis,
  type HairStatus,
  type Season,
  type SkinBand,
} from "./seasons.config";

// ─────────────────────────────────────────────────────────────────────────────
// Inputs and outputs
// ─────────────────────────────────────────────────────────────────────────────

/** CIELCh statistics for one region. */
export interface RegionStats {
  /** Lightness, 0-100. */
  L: number;
  /** Chroma. */
  C: number;
  /** Hue angle in degrees, 0-360. */
  h: number;
}

export interface MeasuredFeatures {
  skin: RegionStats;
  /** Null when the region was absent or below its minimum pixel count. */
  hair: RegionStats | null;
  eyes: RegionStats | null;
  /** Whether visible hair reflects natural colouring. */
  hairStatus: HairStatus;
}

export type HueLabel = "cool" | "neutral-cool" | "neutral-warm" | "warm";
export type ValueLabel = "dark" | "medium" | "light";
export type ChromaLabel = "soft" | "medium" | "bright";
export type ContrastLabel = "low" | "medium" | "high";

export interface AxisCall<L extends string> {
  /** Position on the axis, -1 to +1. */
  value: number;
  label: L;
}

export interface SeasonScore {
  season: Season;
  /** 0-100, higher is better. */
  score: number;
}

export interface ScoreResult {
  primary: Season;
  /** Whichever flow-circle neighbour of `primary` scored higher. */
  secondary: Season;
  /** primary.score minus secondary.score. Below SCORING.ambiguousMargin the
   *  call is not trustworthy on its own. */
  margin: number;
  ambiguous: boolean;
  ranked: SeasonScore[];
  axes: {
    hue: AxisCall<HueLabel>;
    value: AxisCall<ValueLabel>;
    chroma: AxisCall<ChromaLabel>;
  };
  contrast: AxisCall<ContrastLabel> | null;
  /** Which skin-lightness band's thresholds were applied. The eval reports
   *  accuracy per band, so this has to be surfaced. */
  skinBand: SkinBand;
  /** False when hair was dyed, covered, or unmeasurable. */
  hairUsed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function clamp(v: number, lo = -1, hi = 1): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Map a raw measurement onto a normalised axis via its midpoint and half-width. */
function normalise(raw: number, band: { neutral: number; span: number }): number {
  return clamp((raw - band.neutral) / band.span);
}

/** Which skin-lightness band a measured skin L* falls into. */
export function skinBandOf(skinL: number): SkinBand {
  if (skinL < SKIN_BANDS.deepBelow) return "deep";
  if (skinL >= SKIN_BANDS.lightAtOrAbove) return "light";
  return "medium";
}

/**
 * Combine weighted parts, dropping any whose value is null and redistributing
 * that weight across the rest. Returns 0 if nothing is usable.
 */
function weightedMean(parts: { value: number | null; weight: number }[]): number {
  const usable = parts.filter((p) => p.value !== null && p.weight > 0);
  const total = usable.reduce((s, p) => s + p.weight, 0);
  if (total === 0) return 0;
  return usable.reduce((s, p) => s + (p.value as number) * (p.weight / total), 0);
}

/** Smallest absolute difference between two hue angles, respecting the wrap. */
export function hueDelta(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function label3<L extends string>(
  v: number,
  lo: number,
  hi: number,
  labels: [L, L, L]
): L {
  return v <= lo ? labels[0] : v >= hi ? labels[2] : labels[1];
}

// ─────────────────────────────────────────────────────────────────────────────
// Axis derivation
// ─────────────────────────────────────────────────────────────────────────────

/** Is this hair usable as evidence about natural colouring? */
export function hairIsUsable(f: MeasuredFeatures): boolean {
  return f.hairStatus === "natural" && f.hair !== null;
}

function hueAxis(f: MeasuredFeatures, band: SkinBand): number {
  // Skin only. Hair and eyes are weighted 0 because hue angle is circular and a
  // linear projection misreads them — see the note in seasons.config.ts.
  const skin = normalise(f.skin.h, HUE.skinByBand[band]);
  return weightedMean([
    { value: skin, weight: HUE.weights.skin },
    { value: f.eyes ? normalise(f.eyes.h, HUE.skinByBand[band]) : null, weight: HUE.weights.eyes },
    { value: f.hair ? normalise(f.hair.h, HUE.skinByBand[band]) : null, weight: HUE.weights.hair },
  ]);
}

function valueAxis(f: MeasuredFeatures): number {
  const useHair = hairIsUsable(f);
  return weightedMean([
    { value: normalise(f.skin.L, VALUE.skin), weight: VALUE.weights.skin },
    {
      value: useHair ? normalise(f.hair!.L, VALUE.hair) : null,
      weight: VALUE.weights.hair,
    },
  ]);
}

function chromaAxis(f: MeasuredFeatures, band: SkinBand): number {
  const useHair = hairIsUsable(f);
  return weightedMean([
    { value: normalise(f.skin.C, CHROMA.skinByBand[band]), weight: CHROMA.weights.skin },
    { value: f.eyes ? normalise(f.eyes.C, CHROMA.eyes) : null, weight: CHROMA.weights.eyes },
    {
      value: useHair ? normalise(f.hair!.C, CHROMA.hair) : null,
      weight: CHROMA.weights.hair,
    },
  ]);
}

/** Weighted |delta-L*| against skin. Null when nothing comparable is available. */
function contrastValue(f: MeasuredFeatures): number | null {
  const useHair = hairIsUsable(f);
  const parts = [
    {
      value: useHair ? Math.abs(f.hair!.L - f.skin.L) : null,
      weight: CONTRAST.weights.hairSkin,
    },
    {
      value: f.eyes ? Math.abs(f.eyes.L - f.skin.L) : null,
      weight: CONTRAST.weights.eyesSkin,
    },
  ];
  if (parts.every((p) => p.value === null)) return null;
  return weightedMean(parts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

function axisWeight(season: Season, axis: Axis): number {
  const p = SEASON_PROFILES[season];
  if (axis === p.dominant) return AXIS_WEIGHTS.dominant;
  if (axis === p.secondary) return AXIS_WEIGHTS.secondary;
  return AXIS_WEIGHTS.remaining;
}

/**
 * Worst possible weighted distance: every axis at the opposite extreme.
 * Used to put scores on a stable 0-100 scale rather than an arbitrary one.
 */
const MAX_DISTANCE = Math.sqrt(
  4 * (AXIS_WEIGHTS.dominant + AXIS_WEIGHTS.secondary + AXIS_WEIGHTS.remaining)
);

const AXES: Axis[] = ["hue", "value", "chroma"];

function distanceTo(
  season: Season,
  measured: Record<Axis, number>,
  contrastLabel: ContrastLabel | null
): number {
  const target = SEASON_PROFILES[season].target;
  let sum = 0;
  for (const axis of AXES) {
    const d = measured[axis] - target[axis];
    sum += axisWeight(season, axis) * d * d;
  }
  let distance = Math.sqrt(sum);

  // Contrast nudge: reward a season whose expected contrast we actually see,
  // penalise the opposite, ignore "medium".
  const expected = CONTRAST.expects[season];
  if (expected && contrastLabel && contrastLabel !== "medium") {
    distance +=
      contrastLabel === expected
        ? -CONTRAST.adjustmentStrength
        : CONTRAST.adjustmentStrength;
  }
  return Math.max(0, distance);
}

function toScore(distance: number): number {
  return Math.round(clamp(1 - distance / MAX_DISTANCE, 0, 1) * 1000) / 10;
}

/**
 * Rank all 12 seasons from measured features.
 *
 * The secondary season is not read from a table — it is whichever of the
 * winner's two flow-circle neighbours scores higher, because which way a face
 * leans is a property of the face, not of the season.
 */
export function score(features: MeasuredFeatures): ScoreResult {
  const band = skinBandOf(features.skin.L);

  const measured: Record<Axis, number> = {
    hue: hueAxis(features, band),
    value: valueAxis(features),
    chroma: chromaAxis(features, band),
  };

  const rawContrast = contrastValue(features);
  const contrastLabel: ContrastLabel | null =
    rawContrast === null
      ? null
      : label3<ContrastLabel>(rawContrast, CONTRAST.labels.low, CONTRAST.labels.high, [
          "low",
          "medium",
          "high",
        ]);

  const ranked: SeasonScore[] = SEASONS.map((season) => ({
    season,
    score: toScore(distanceTo(season, measured, contrastLabel)),
  })).sort((a, b) => b.score - a.score || a.season.localeCompare(b.season));

  const primary = ranked[0].season;
  const bySeason = new Map(ranked.map((r) => [r.season, r.score]));

  const [prev, next] = flowNeighbours(primary);
  const secondary =
    (bySeason.get(prev) ?? 0) >= (bySeason.get(next) ?? 0) ? prev : next;
  const margin =
    Math.round((ranked[0].score - (bySeason.get(secondary) ?? 0)) * 10) / 10;

  return {
    primary,
    secondary,
    margin,
    ambiguous: margin < SCORING.ambiguousMargin,
    ranked,
    axes: {
      hue: {
        value: measured.hue,
        label:
          measured.hue <= HUE.labels.cool
            ? "cool"
            : measured.hue < HUE.labels.neutralCool
              ? "neutral-cool"
              : measured.hue < HUE.labels.neutralWarm
                ? "neutral-warm"
                : "warm",
      },
      value: {
        value: measured.value,
        label: label3(measured.value, VALUE.labels.dark, VALUE.labels.light, [
          "dark",
          "medium",
          "light",
        ]),
      },
      chroma: {
        value: measured.chroma,
        label: label3(measured.chroma, CHROMA.labels.soft, CHROMA.labels.bright, [
          "soft",
          "medium",
          "bright",
        ]),
      },
    },
    contrast:
      rawContrast === null || contrastLabel === null
        ? null
        : { value: rawContrast, label: contrastLabel },
    skinBand: band,
    hairUsed: hairIsUsable(features),
  };
}
