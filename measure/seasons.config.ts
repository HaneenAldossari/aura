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
 * the secondary.
 *
 * All axes are normalised to [-1, +1]:
 *   hue     -1 = coolest,  +1 = warmest
 *   value   -1 = darkest,  +1 = lightest
 *   chroma  -1 = softest,  +1 = brightest
 *
 * ── The file is in two halves ────────────────────────────────────────────────
 * SECTION 1 — STRUCTURE. Season targets, the flow circle, axis weights. These
 * come from the 12-season system itself and should only change if the theory is
 * being reinterpreted.
 *
 * SECTION 2 — THRESHOLDS. Where a measured L* / C* / h-angle sits on each axis.
 * Every one of these is an estimate. Each is marked "estimate — calibrate in
 * Phase 4", and calibrating them against labelled real photos is precisely what
 * the eval harness is for. Nothing here is sourced or validated yet.
 */

/**
 * The 12 canonical seasons. Deliberately redeclared here rather than imported
 * from server/prompts/colorAnalysis.ts: measure/ must stay framework-free and
 * standalone so it can run in the browser and under headless Chromium without
 * pulling the server's prompt text into the bundle. A unit test pins this list
 * to the server's CANONICAL_SEASONS.
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

/** Skin lightness band. Melanin confounds both hue angle and chroma, so those
 *  two thresholds are stored per band and calibrated independently. */
export type SkinBand = "light" | "medium" | "deep";

/**
 * Whether the hair we can see is the hair we can reason about.
 *
 * Dyed hair carries no information about natural colouring, and covered hair
 * (hijab, hat, wig, tight crop) carries none at all. Both drop hair from the
 * value, chroma and contrast calculations and redistribute its weight, rather
 * than contributing a misleading number. The client asks with a one-tap toggle.
 */
export type HairStatus = "natural" | "dyed" | "covered";

/** Where a season sits on each axis, plus which axes define it. */
export interface SeasonProfile {
  /** Target position on each axis, in [-1, +1]. */
  target: Record<Axis, number>;
  /** The trait the season is named for. Weighted heaviest when scoring. */
  dominant: Axis;
  /** The trait that separates it from its mirror season. */
  secondary: Axis;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — STRUCTURE (from the 12-season system; not tuning knobs)
// ═════════════════════════════════════════════════════════════════════════════

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
 * The 12-season flow circle, in order. Adjacent seasons share a dominant trait
 * and shade into one another; the circle wraps from the last entry to the first.
 *
 * The secondary season is NOT a fixed property of a season — it depends on which
 * way this particular face leans. score() returns whichever of a season's two
 * circle neighbours scores higher, and the margin is measured against that
 * neighbour rather than against the runner-up globally.
 */
export const FLOW_CIRCLE = [
  "Bright Winter",
  "Bright Spring",
  "True Spring",
  "Light Spring",
  "Light Summer",
  "True Summer",
  "Soft Summer",
  "Soft Autumn",
  "True Autumn",
  "Deep Autumn",
  "Deep Winter",
  "True Winter",
] as const satisfies readonly Season[];

/** The two seasons adjacent to `season` on the flow circle. */
export function flowNeighbours(season: Season): [Season, Season] {
  const i = FLOW_CIRCLE.indexOf(season as (typeof FLOW_CIRCLE)[number]);
  const n = FLOW_CIRCLE.length;
  return [FLOW_CIRCLE[(i - 1 + n) % n], FLOW_CIRCLE[(i + 1) % n]];
}

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

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — THRESHOLDS
//
// Every number below is an estimate awaiting calibration against labelled real
// photos. None is sourced. Treat all of them as hypotheses.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Skin lightness bands, split on skin L*.
 *
 * Melanin confounds both hue angle and chroma — deeper skin carries higher b*,
 * which raises hue angle and C* independently of undertone. Banding lets the
 * eval calibrate those two axes separately per band instead of forcing one
 * global midpoint that fits mid-tone skin and misreads the ends. The eval must
 * report accuracy per band, otherwise a bias on one band hides inside the mean.
 */
/**
 * Which slice of a region's pixels counts as diffuse skin.
 *
 * Specular reflection is additive and one-sided: a highlight can only ever
 * raise L*, never lower it. A median over the whole patch is therefore a
 * biased estimator of skin colour, and the bias grows with how glossy the
 * lighting is — measured on the demo faces it ran +8 to +15 L*, worst on the
 * deepest skin, where the specular-to-diffuse contrast is highest. That is
 * enough to move a face two whole bands.
 *
 * Shadow contaminates the other tail (the unlit side of the face, pores,
 * occlusion), so the estimate comes from a band rather than a low percentile.
 * The band sits slightly below the median because only one tail is additive:
 * trimming harder at the top than the bottom is the asymmetry the physics
 * asks for.
 *
 * estimate — calibrate in Phase 4 against real photos with known colouring.
 */
export const SPECULAR = {
  /** Fraction of the region's L* range, sorted ascending, taken as diffuse. */
  diffuseBand: { lo: 0.25, hi: 0.6 },
} as const;

/**
 * Turning a measured region into a word.
 *
 * Presentation, not classification: nothing here feeds score(). The trait line
 * on Results says "Deep brown" where the table says "18.2 / 9.6 / 41.3", and
 * both describe the same measurement — one of them can be checked in a mirror.
 *
 * In config because it is a set of numeric cut-offs, and those live in config.
 *
 * estimate — these are descriptive bands, not calibrated ones.
 */
export const DESCRIPTORS = {
  /** Hair and eye depth by L*, darkest first. */
  depth: [
    { below: 18, word: "Black" },
    { below: 30, word: "Deep brown" },
    { below: 45, word: "Brown" },
    { below: 60, word: "Light brown" },
    { below: 75, word: "Dark blonde" },
    { below: 101, word: "Blonde" },
  ],
  /** Eyes are named on the same depth scale but with their own vocabulary. */
  eyeDepth: [
    { below: 18, word: "Very dark" },
    { below: 30, word: "Dark" },
    { below: 45, word: "Medium" },
    { below: 101, word: "Light" },
  ],
  /**
   * Warmth prefix, by hue angle. Only applied above a minimum chroma: hue is
   * undefined at zero chroma, and calling a neutral-black hair "warm" because
   * its hue landed at 61 degrees would be reading noise aloud.
   */
  warmth: { minChroma: 6, warmBelow: 70, coolAbove: 200 },
} as const;

export const SKIN_BANDS = {
  /** L* below this is "deep". estimate — calibrate in Phase 4 */
  deepBelow: 45.0,
  /** L* at or above this is "light". estimate — calibrate in Phase 4 */
  lightAtOrAbove: 65.0,
} as const;

/**
 * HUE — from skin only.
 *
 *   axis = clamp((h - neutral) / span, -1, +1)
 *
 * Hair and eyes are deliberately weighted 0. Hue angle is CIRCULAR, and a linear
 * map along it is simply wrong for them: auburn hair sits near 35 degrees and
 * would read cool, while green eyes near 130 degrees would read maximally warm.
 * Both are backwards.
 *
 * FUTURE EVAL EXPERIMENT: reintroduce hair and eyes through a CATEGORICAL
 * temperature mapping instead — classify the region into a named colour
 * (auburn / ash brown / blue / green / hazel ...) and attach a warm-cool score
 * to the category, rather than projecting a circular angle onto a line. Only
 * worth doing if the eval shows skin-only hue underperforming.
 */
export const HUE = {
  /** Per skin-lightness band. All three start identical so the eval can move
   *  them independently and the split itself costs nothing until it is used. */
  skinByBand: {
    /** estimate — calibrate in Phase 4 */
    light: { neutral: 52.5, span: 10.0 },
    /** estimate — calibrate in Phase 4 */
    medium: { neutral: 52.5, span: 10.0 },
    /** estimate — calibrate in Phase 4 */
    deep: { neutral: 52.5, span: 10.0 },
  } satisfies Record<SkinBand, { neutral: number; span: number }>,
  /** Skin only. See the note above before changing eyes or hair off zero. */
  weights: { skin: 1.0, eyes: 0.0, hair: 0.0 },
  /** Label breakpoints on the normalised axis. estimate — calibrate in Phase 4 */
  labels: { cool: -0.45, neutralCool: 0.0, neutralWarm: +0.45 },
} as const;

/**
 * VALUE — from L* of skin and hair.
 *
 *   axis = clamp((L - neutral) / span, -1, +1)
 *
 * Hair carries real weight: dark hair against fair skin is what separates Deep
 * Winter from Light Summer, and skin L* alone cannot see that. Dropped entirely
 * when hairStatus is "dyed" or "covered".
 */
export const VALUE = {
  /** estimate — calibrate in Phase 4 */
  skin: { neutral: 50.0, span: 25.0 },
  /** estimate — calibrate in Phase 4 */
  hair: { neutral: 40.0, span: 30.0 },
  /** estimate — calibrate in Phase 4 */
  weights: { skin: 0.6, hair: 0.4 },
  /** estimate — calibrate in Phase 4 */
  labels: { dark: -0.35, light: +0.35 },
} as const;

/**
 * CHROMA — from C* of skin, eyes and hair.
 *
 *   axis = clamp((C - neutral) / span, -1, +1)
 *
 * Skin chroma is banded for the same melanin reason as hue. Eyes matter more
 * here than anywhere else: a clear, saturated iris is the strongest single
 * signal separating Bright from Soft.
 */
export const CHROMA = {
  skinByBand: {
    /** estimate — calibrate in Phase 4 */
    light: { neutral: 18.0, span: 10.0 },
    /** estimate — calibrate in Phase 4 */
    medium: { neutral: 18.0, span: 10.0 },
    /** estimate — calibrate in Phase 4 */
    deep: { neutral: 18.0, span: 10.0 },
  } satisfies Record<SkinBand, { neutral: number; span: number }>,
  /** estimate — calibrate in Phase 4 */
  eyes: { neutral: 25.0, span: 18.0 },
  /** estimate — calibrate in Phase 4 */
  hair: { neutral: 20.0, span: 15.0 },
  /** estimate — calibrate in Phase 4 */
  weights: { skin: 0.4, eyes: 0.35, hair: 0.25 },
  /** estimate — calibrate in Phase 4 */
  labels: { soft: -0.35, bright: +0.35 },
} as const;

/**
 * CONTRAST — the RANGE of L* across the available features: the lightest minus
 * the darkest of skin, hair and eyes.
 *
 * Range, not a weighted mean of pairwise deltas. The earlier weighted-mean
 * formulation averaged the hair-skin delta with the always-smaller eyes-skin
 * delta, which dragged every result below the hair-skin figure and made a
 * genuinely high-contrast face (skin L*60 / hair L*20 / iris L*30) compute to
 * 36.5 and label "medium". A range says what contrast actually means: how far
 * apart this person's lightest and darkest features are.
 *
 * Needs at least two usable features. When hair is covered or dyed the range is
 * taken across skin and eyes alone, which naturally yields a lower figure —
 * expect the breakpoints below to need recalibrating for that case too.
 *
 * Not a fourth axis. It is a nudge applied after the three axes, because it is
 * the one measurement that reliably separates specific neighbours — Soft Summer
 * from True Summer, and the Bright and Deep seasons from their surroundings.
 */
export const CONTRAST = {
  /** estimate — calibrate in Phase 4. Carried over from the weighted-mean
   *  definition, so these are near-certain to need moving now that the metric
   *  reports a range rather than an average. */
  labels: { low: 20.0, high: 40.0 },
  /**
   * How far a contrast match or mismatch may move a season's weighted distance.
   * Kept small on purpose — contrast is a tiebreaker, never a primary signal.
   * estimate — calibrate in Phase 4
   */
  adjustmentStrength: 0.15,
  /** Seasons whose identity depends on unusually low or high contrast. */
  expects: {
    "Soft Summer": "low",
    "Soft Autumn": "low",
    "Bright Winter": "high",
    "Bright Spring": "high",
    "Deep Winter": "high",
    "True Winter": "high",
  } as Partial<Record<Season, "low" | "high">>,
} as const;

/** Confidence, fallbacks and region trust. */
export const SCORING = {
  /**
   * Scores are reported 0-100, higher is better. Margin is the primary's score
   * minus the better of its two flow-circle neighbours. Below this the call is
   * genuinely ambiguous, and Phase 2 uses it to decide whether to ask for a
   * second photo. estimate — calibrate in Phase 4
   */
  ambiguousMargin: 6.0,
  /**
   * When hair is unusable — covered, dyed, or badly segmented — its weight is
   * redistributed across the remaining regions rather than treated as zero. A
   * zero would read as black hair and drag every result toward Deep.
   */
  redistributeOnMissingRegion: true,
  /** Minimum pixels in a region before its statistics are trusted.
   *  estimate — calibrate in Phase 4 */
  minRegionPixels: { skin: 1500, hair: 800, eyes: 120, lips: 200 },
} as const;
