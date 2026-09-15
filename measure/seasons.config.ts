/**
 * The 12-season axis table and every threshold the rule-based scorer uses.
 *
 * ── How to read this file ────────────────────────────────────────────────────
 * The 12-season system places each season on three axes:
 *
 *   hue     cool ....................... warm
 *   value   dark ....................... light
 *   chroma  soft ....................... bright
 *
 * Each season has a DOMINANT trait (the one it is named for) and a SECONDARY
 * trait. The four "True" seasons are dominant in hue; the eight "tonal" seasons
 * (Light/Deep/Soft/Bright) are dominant in value or chroma and take their hue as
 * the secondary. That structure is what makes the classic confusion pairs
 * adjacent here — Soft Autumn/Soft Summer, Deep Autumn/Deep Winter,
 * Bright Spring/Bright Winter, Light Spring/Light Summer differ only in hue.
 *
 * All axes are normalised to [-1, +1]:
 *   hue     -1 = coolest,  +1 = warmest
 *   value   -1 = darkest,  +1 = lightest
 *   chroma  -1 = softest,  +1 = brightest
 *
 * ── Status of the numbers ────────────────────────────────────────────────────
 * The SEASON TARGETS are structural: they come from the 12-season system itself
 * and should only change if the theory is being reinterpreted.
 *
 * The MEASUREMENT THRESHOLDS below them are not. They are informed starting
 * estimates for where a measured L* / C* / h° sits on each axis, and they are the
 * thing the eval harness exists to calibrate. Skin hue angle in particular
 * varies with melanin level, so a single global breakpoint will fit some skin
 * tones better than others — expect to revisit HUE once there is a labelled
 * real-photo set. Treat every number in the THRESHOLDS section as a hypothesis.
 */

/**
 * The 12 canonical seasons. Deliberately redeclared here rather than imported
 * from server/prompts/colorAnalysis.ts: measure/ must stay framework-free and
 * standalone so it can run in the browser and under headless Chromium without
 * pulling the server's prompt text into the bundle. A unit test asserts this
 * list stays identical to the server's CANONICAL_SEASONS.
 */
export const SEASONS = [
  "Light Spring",
  "True Spring",
  "Bright Spring",
  "Light Summer",
  "True Summer",
  "Soft Summer",
  "Soft Autumn",
  "True Autumn",
  "Deep Autumn",
  "Deep Winter",
  "True Winter",
  "Bright Winter",
] as const;

export type Season = (typeof SEASONS)[number];
export type Axis = "hue" | "value" | "chroma";

/** Where a season sits on each axis, plus which axes define it. */
export interface SeasonProfile {
  /** Target position on each axis, in [-1, +1]. */
  target: Record<Axis, number>;
  /** The trait the season is named for. Weighted heaviest when scoring. */
  dominant: Axis;
  /** The trait that separates it from its mirror season. */
  secondary: Axis;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON TARGETS — structural, from the 12-season system
// ─────────────────────────────────────────────────────────────────────────────

export const SEASON_PROFILES: Record<Season, SeasonProfile> = {
  // ── Dominant VALUE: light ──
  "Light Spring": {
    target: { hue: +0.45, value: +0.85, chroma: +0.35 },
    dominant: "value",
    secondary: "hue",
  },
  "Light Summer": {
    target: { hue: -0.45, value: +0.85, chroma: -0.3 },
    dominant: "value",
    secondary: "hue",
  },

  // ── Dominant HUE: warm ──
  "True Spring": {
    target: { hue: +0.9, value: +0.35, chroma: +0.55 },
    dominant: "hue",
    secondary: "chroma",
  },
  "True Autumn": {
    target: { hue: +0.9, value: -0.35, chroma: -0.5 },
    dominant: "hue",
    secondary: "chroma",
  },

  // ── Dominant HUE: cool ──
  "True Summer": {
    target: { hue: -0.9, value: 0.0, chroma: -0.45 },
    dominant: "hue",
    secondary: "chroma",
  },
  "True Winter": {
    target: { hue: -0.9, value: -0.2, chroma: +0.5 },
    dominant: "hue",
    secondary: "chroma",
  },

  // ── Dominant CHROMA: bright ──
  "Bright Spring": {
    target: { hue: +0.4, value: +0.2, chroma: +0.9 },
    dominant: "chroma",
    secondary: "hue",
  },
  "Bright Winter": {
    target: { hue: -0.4, value: -0.15, chroma: +0.9 },
    dominant: "chroma",
    secondary: "hue",
  },

  // ── Dominant CHROMA: soft ──
  "Soft Autumn": {
    target: { hue: +0.4, value: -0.05, chroma: -0.9 },
    dominant: "chroma",
    secondary: "hue",
  },
  "Soft Summer": {
    target: { hue: -0.4, value: -0.05, chroma: -0.9 },
    dominant: "chroma",
    secondary: "hue",
  },

  // ── Dominant VALUE: dark ──
  "Deep Autumn": {
    target: { hue: +0.45, value: -0.85, chroma: -0.25 },
    dominant: "value",
    secondary: "hue",
  },
  "Deep Winter": {
    target: { hue: -0.45, value: -0.85, chroma: +0.25 },
    dominant: "value",
    secondary: "hue",
  },
};

/**
 * How heavily each axis counts when scoring a season. A season is judged mostly
 * on the trait it is named for — a Soft Autumn who reads slightly light is still
 * Soft Autumn, but one who reads bright is not.
 */
export const AXIS_WEIGHTS = {
  dominant: 3.0,
  secondary: 2.0,
  remaining: 1.0,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT THRESHOLDS — hypotheses, to be calibrated by the eval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HUE — from CIELCh hue angle h° of the skin, with eyes and hair as support.
 *
 * Skin sits roughly between 40° (pink/red, cool) and 75° (yellow/gold, warm).
 * `neutral` is the midpoint; `span` is the half-width that maps to ±1, so
 *   axis = clamp((h - neutral) / span, -1, +1)
 *
 * CAVEAT: this is the weakest assumption in the file. Hue angle drifts with
 * melanin level — deeply pigmented skin trends to higher b* regardless of
 * undertone — so a single global midpoint will systematically read deep skin as
 * warm. Calibrating this per value-band is the first thing to try if the eval
 * shows a warm bias on darker faces.
 */
export const HUE = {
  skin: { neutral: 52.5, span: 10.0 },
  eyes: { neutral: 55.0, span: 20.0 },
  hair: { neutral: 55.0, span: 20.0 },
  /** Skin dominates: the undertone lives there, hair and eyes only corroborate. */
  weights: { skin: 0.6, eyes: 0.25, hair: 0.15 },
  /** Label breakpoints on the normalised axis. */
  labels: { cool: -0.45, neutralCool: 0.0, neutralWarm: +0.45 },
} as const;

/**
 * VALUE — from L* of skin and hair.
 *
 *   axis = clamp((L - neutral) / span, -1, +1)
 *
 * Hair carries real weight: dark hair against fair skin is what separates Deep
 * Winter from Light Summer, and skin L* alone cannot see that.
 */
export const VALUE = {
  skin: { neutral: 50.0, span: 25.0 },
  hair: { neutral: 40.0, span: 30.0 },
  weights: { skin: 0.6, hair: 0.4 },
  labels: { dark: -0.35, light: +0.35 },
} as const;

/**
 * CHROMA — from C* of skin, eyes and hair.
 *
 *   axis = clamp((C - neutral) / span, -1, +1)
 *
 * Eyes matter more here than anywhere else: a clear, saturated iris is the
 * strongest single signal separating Bright from Soft.
 */
export const CHROMA = {
  skin: { neutral: 18.0, span: 10.0 },
  eyes: { neutral: 25.0, span: 18.0 },
  hair: { neutral: 20.0, span: 15.0 },
  weights: { skin: 0.4, eyes: 0.35, hair: 0.25 },
  labels: { soft: -0.35, bright: +0.35 },
} as const;

/**
 * CONTRAST — |ΔL*| between hair and skin, and between eyes and skin.
 *
 * Not a fourth axis. It is a nudge applied after the three axes, because it is
 * the one measurement that reliably separates two specific pairs:
 *   · Soft Summer (lowest contrast of the cool seasons) from True Summer
 *   · Bright Winter / Bright Spring (high contrast) from their neighbours
 */
export const CONTRAST = {
  weights: { hairSkin: 0.65, eyesSkin: 0.35 },
  labels: { low: 20.0, high: 40.0 },
  /**
   * How far a contrast mismatch may move a season's score, in the same units as
   * the weighted distance. Kept deliberately small — contrast is a tiebreaker,
   * never a primary signal.
   */
  adjustmentStrength: 0.15,
  /** Seasons whose identity depends on unusually low or high contrast. */
  expects: {
    "Soft Summer": "low",
    "Soft Autumn": "low",
    "Bright Winter": "high",
    "Bright Spring": "high",
    "Deep Winter": "high",
  } as Partial<Record<Season, "low" | "high">>,
} as const;

/**
 * Confidence and fallbacks.
 */
export const SCORING = {
  /**
   * Gap between the best and second-best season, on the weighted-distance
   * scale, below which the call is treated as genuinely ambiguous. Phase 2 uses
   * this to decide whether to ask for a second photo.
   */
  ambiguousMargin: 0.35,
  /**
   * When hair is unavailable (hijab, hat, tight crop, bad segmentation), its
   * weight is redistributed across the remaining regions rather than treated as
   * zero — a zero would read as black hair and drag every result toward Deep.
   */
  redistributeOnMissingRegion: true,
  /** Minimum pixels in a region before its statistics are trusted. */
  minRegionPixels: { skin: 1500, hair: 800, eyes: 120, lips: 200 },
} as const;
