/**
 * The measured regions, said in words.
 *
 * Presentation only — nothing here feeds the classifier. The trait line says
 * "Deep brown" where the table says "18.2 / 9.6 / 41.3"; they describe the same
 * measurement, and only one of them can be checked in a mirror.
 *
 * Falls back to the model's prose where a region was not measured, trimmed to
 * its first clause — those sentences are written to be read in full elsewhere
 * and are far too long for a trait line.
 */
import { DESCRIPTORS } from "../../../measure/seasons.config";
import type { RegionReading } from "./types";

function band(value: number, table: readonly { below: number; word: string }[]): string {
  return table.find((b) => value < b.below)?.word ?? table[table.length - 1].word;
}

function warmth(reading: RegionReading): string | null {
  // Hue is meaningless at low chroma, so a near-neutral region gets no prefix
  // rather than a confident one derived from noise.
  if (reading.C < DESCRIPTORS.warmth.minChroma) return null;
  if (reading.h < DESCRIPTORS.warmth.warmBelow) return "warm";
  if (reading.h > DESCRIPTORS.warmth.coolAbove) return "cool";
  return null;
}

export function describeHair(reading: RegionReading | null | undefined): string | null {
  if (!reading) return null;
  const depth = band(reading.L, DESCRIPTORS.depth);
  const tone = warmth(reading);
  return tone ? `${depth}, ${tone}` : depth;
}

export function describeEyes(reading: RegionReading | null | undefined): string | null {
  if (!reading) return null;
  return band(reading.L, DESCRIPTORS.eyeDepth);
}

/** First clause of a model sentence, capped so it stays a trait not a paragraph. */
export function shortenPhrase(raw: string | undefined, maxWords = 4): string | null {
  if (!raw) return null;
  const clause = raw.split(/[.,;]|\bwith\b/)[0].trim();
  if (!clause) return null;
  const words = clause.split(/\s+/).slice(0, maxWords).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
