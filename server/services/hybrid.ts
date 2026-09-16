/**
 * The hybrid half of classification.
 *
 * The client measures; this validates what it sent, ranks the seasons from it,
 * and afterwards checks whether the model agreed.
 *
 * The model never sees the ranking. It is given the image and the measured
 * colour values only, because a model shown the rule-based answer would anchor
 * on it and the agreement check would be measuring nothing. Agreement is
 * computed here, after the model has committed.
 *
 * Because measure/ is framework-free TypeScript, the server imports score()
 * directly. The client sends measurements, never a ranking — one source of
 * truth, and nothing a client sends can substitute its own verdict.
 */

import { score, type MeasuredFeatures, type RegionStats, type ScoreResult } from "../../measure/score";
import { SEASONS, type HairStatus, type Season } from "../../measure/seasons.config";

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationFailure {
  ok: false;
  reason: string;
}

export interface ValidationSuccess {
  ok: true;
  features: MeasuredFeatures;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const HAIR_STATUSES: HairStatus[] = ["natural", "dyed", "covered"];

/** Lab chroma has no hard ceiling, but nothing real exceeds this. */
const MAX_CHROMA = 200;

function validateRegion(value: unknown, name: string): RegionStats | ValidationFailure {
  if (value === null || value === undefined) {
    return { ok: false, reason: `${name} missing` };
  }
  if (typeof value !== "object") {
    return { ok: false, reason: `${name} is not an object` };
  }
  const r = value as Record<string, unknown>;
  const L = Number(r.L);
  const C = Number(r.C);
  const h = Number(r.h);

  if (!Number.isFinite(L) || L < 0 || L > 100) {
    return { ok: false, reason: `${name}.L out of range (0-100): ${r.L}` };
  }
  if (!Number.isFinite(C) || C < 0 || C > MAX_CHROMA) {
    return { ok: false, reason: `${name}.C out of range (0-${MAX_CHROMA}): ${r.C}` };
  }
  if (!Number.isFinite(h) || h < 0 || h > 360) {
    return { ok: false, reason: `${name}.h out of range (0-360): ${r.h}` };
  }
  return { L, C, h };
}

function isFailure(v: unknown): v is ValidationFailure {
  return typeof v === "object" && v !== null && (v as ValidationFailure).ok === false;
}

/**
 * Validate features that arrived from a client.
 *
 * These are untrusted input that go on to steer a paid model call, so ranges are
 * checked rather than assumed. A malformed payload is rejected outright instead
 * of being silently coerced into a plausible-looking measurement.
 */
export function validateFeatures(raw: unknown): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "features is not an object" };
  }
  const f = raw as Record<string, unknown>;

  const skin = validateRegion(f.skin, "skin");
  if (isFailure(skin)) return skin;

  let hair: RegionStats | null = null;
  if (f.hair !== null && f.hair !== undefined) {
    const checked = validateRegion(f.hair, "hair");
    if (isFailure(checked)) return checked;
    hair = checked;
  }

  let eyes: RegionStats | null = null;
  if (f.eyes !== null && f.eyes !== undefined) {
    const checked = validateRegion(f.eyes, "eyes");
    if (isFailure(checked)) return checked;
    eyes = checked;
  }

  const hairStatus = f.hairStatus as HairStatus;
  if (!HAIR_STATUSES.includes(hairStatus)) {
    return { ok: false, reason: `hairStatus must be one of ${HAIR_STATUSES.join(", ")}` };
  }

  return { ok: true, features: { skin, hair, eyes, hairStatus } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agreement
// ─────────────────────────────────────────────────────────────────────────────

export type AgreementLevel = "primary" | "secondary" | "none";

export interface Agreement {
  level: AgreementLevel;
  agrees: boolean;
  /** The rule-based verdict, for display and for the eval. */
  rulesPrimary: Season;
  rulesSecondary: Season;
  rulesMargin: number;
  /** Upper bound on reported confidence. 1 means no cap. */
  confidenceCap: number;
  /**
   * A suggestion, not a gate. The thresholds behind it are uncalibrated
   * estimates, so it must not block a result until Phase 4 has tuned them.
   */
  needsSecondPhoto: boolean;
  /** Rule-based ranking, offered when the two disagree. */
  alternatives: { season: Season; score: number }[];
}

/** Confidence ceiling when the model and the rules pick unrelated seasons. */
export const DISAGREEMENT_CONFIDENCE_CAP = 0.5;

/** How many rule-based candidates to offer as alternatives. */
const ALTERNATIVE_COUNT = 3;

function normaliseSeason(value: unknown): Season | null {
  if (typeof value !== "string") return null;
  const target = value.trim().toLowerCase();
  return SEASONS.find((s) => s.toLowerCase() === target) ?? null;
}

/**
 * Compare the model's verdict against the rule-based ranking.
 *
 * Matching either the rules' primary or its flow-circle secondary counts as
 * agreement: the secondary is where this face genuinely leans, so landing there
 * is a near miss in the sense that matters, not a contradiction.
 */
export function computeAgreement(rules: ScoreResult, llmSeason: unknown): Agreement {
  const season = normaliseSeason(llmSeason);
  const alternatives = rules.ranked.slice(0, ALTERNATIVE_COUNT);

  const level: AgreementLevel =
    season === rules.primary
      ? "primary"
      : season === rules.secondary
        ? "secondary"
        : "none";

  return {
    level,
    agrees: level !== "none",
    rulesPrimary: rules.primary,
    rulesSecondary: rules.secondary,
    rulesMargin: rules.margin,
    confidenceCap: level === "none" ? DISAGREEMENT_CONFIDENCE_CAP : 1,
    needsSecondPhoto: level === "none",
    alternatives,
  };
}

/** Rank the seasons from validated features. */
export function rankSeasons(features: MeasuredFeatures): ScoreResult {
  return score(features);
}

/**
 * The measurement block handed to the model.
 *
 * Deliberately excludes any ranking or season name. Plain numbers with units, so
 * the model reads them as observations rather than as a suggestion.
 */
export function describeFeatures(features: MeasuredFeatures, axes: ScoreResult["axes"]): string {
  const region = (name: string, r: RegionStats | null) =>
    r === null
      ? `${name}: not measurable in this photo`
      : `${name}: L* ${r.L.toFixed(1)}, C* ${r.C.toFixed(1)}, hue ${r.h.toFixed(1)} deg`;

  const lines = [
    "MEASURED COLOUR VALUES (CIE Lab, D65) — these are instrument readings from",
    "this photo, not estimates. Treat them as ground truth.",
    "",
    region("Skin", features.skin),
    region("Hair", features.hair),
    region("Eyes", features.eyes),
    "",
    `Derived axes: hue ${axes.hue.label} (${axes.hue.value.toFixed(2)}), ` +
      `value ${axes.value.label} (${axes.value.value.toFixed(2)}), ` +
      `chroma ${axes.chroma.label} (${axes.chroma.value.toFixed(2)})`,
  ];

  if (features.hairStatus !== "natural") {
    lines.push(
      "",
      `The user reported their hair is ${features.hairStatus}, so it carries no`,
      "information about their natural colouring and was excluded."
    );
  } else if (features.hair === null) {
    lines.push("", "Hair could not be measured in this photo and was excluded.");
  }

  return lines.join("\n");
}
