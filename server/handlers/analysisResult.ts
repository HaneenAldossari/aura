/**
 * Validating an analysis result that came back from a client.
 *
 * The API is stateless: there is no session store, so chat and the shop check
 * receive the analysis in the request body. That makes it untrusted input on the
 * way to a paid model call, exactly like measured features, and it gets the same
 * treatment — checked, not assumed.
 *
 * The check is deliberately shallow. It is a shape and sanity check to stop
 * malformed or oversized payloads reaching a model, not an attempt to prove the
 * result was genuinely produced by this service. Nothing here is a security
 * boundary; a caller can always send a plausible-looking analysis of their own,
 * and the only cost of that is their own bill.
 */

import { SEASONS } from "../../measure/seasons.config";

export interface ResultValidationFailure {
  ok: false;
  reason: string;
}

export interface ResultValidationSuccess {
  ok: true;
  result: Record<string, unknown>;
}

export type ResultValidation = ResultValidationSuccess | ResultValidationFailure;

/** Generous ceiling: a real result is about 6 KB. */
const MAX_RESULT_BYTES = 128 * 1024;

const SEASON_NAMES = new Set<string>(SEASONS.map((s) => s.toLowerCase()));

/** Season aliases the palette table accepts, so an older result still validates. */
const ALIASES = new Set([
  "warm spring",
  "clear spring",
  "cool summer",
  "muted summer",
  "muted autumn",
  "warm autumn",
  "dark autumn",
  "dark winter",
  "cool winter",
  "clear winter",
]);

export function validateAnalysisResult(raw: unknown): ResultValidation {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, reason: "analysis is not an object" };
  }

  const size = JSON.stringify(raw).length;
  if (size > MAX_RESULT_BYTES) {
    return { ok: false, reason: `analysis is too large (${size} bytes)` };
  }

  const result = raw as Record<string, unknown>;

  const season = result.season;
  if (typeof season !== "string" || season.trim() === "") {
    return { ok: false, reason: "analysis.season is missing" };
  }
  const key = season.toLowerCase().trim();
  if (!SEASON_NAMES.has(key) && !ALIASES.has(key)) {
    return { ok: false, reason: `analysis.season is not a known season: ${season}` };
  }

  // The palette is what the shop check compares against, so it has to be real.
  const palette = result.palette as { best?: unknown } | undefined;
  if (!palette || typeof palette !== "object") {
    return { ok: false, reason: "analysis.palette is missing" };
  }
  if (!Array.isArray(palette.best) || palette.best.length === 0) {
    return { ok: false, reason: "analysis.palette.best is empty" };
  }

  return { ok: true, result };
}
