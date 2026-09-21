/**
 * Display bandings: the one place a number on screen is turned into a word.
 *
 * Two readouts print a 0-100 value with a word beside it — the Colour DNA axes
 * and the shop score — and both used to take the word from somewhere other
 * than the number. The DNA axes borrowed the measurement layer's own labels
 * (or the model's prose), which are cut on different thresholds from the ones
 * that produce the 0-100 value, so a reader could be shown "Contrast 78 ·
 * medium". Each source was defensible; the pair was not. A label printed next
 * to a number is a claim about that number, so it is derived from that number,
 * here, and nowhere else. tests/displayBands.test.ts holds the two together.
 *
 * Presentation only. Nothing in here reaches the classifier.
 */
import type { Key } from "../i18n/types";

// ── Colour DNA ───────────────────────────────────────────────────────────────

/** One banding for all four axes: ≤35 low, 36-64 medium, ≥65 high. */
export const DNA_BANDS = { lowMax: 35, highMin: 65 } as const;

export type Band = "low" | "medium" | "high";
export type DnaAxis = "warmth" | "depth" | "clarity" | "contrast";

/** The integer a reader sees. Banding happens after this, never before. */
export function displayed(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function bandOf(value: number): Band {
  const shown = displayed(value);
  if (shown <= DNA_BANDS.lowMax) return "low";
  if (shown >= DNA_BANDS.highMin) return "high";
  return "medium";
}

/** What low, medium and high are called on each axis. */
export const DNA_WORDS: Record<DnaAxis, Record<Band, Key>> = {
  warmth: { low: "results.dna.bandCool", medium: "results.dna.bandNeutral", high: "results.dna.bandWarm" },
  depth: { low: "results.dna.bandLight", medium: "results.dna.bandMedium", high: "results.dna.bandDeep" },
  clarity: { low: "results.dna.bandSoft", medium: "results.dna.bandMedium", high: "results.dna.bandBright" },
  contrast: { low: "results.dna.bandLow", medium: "results.dna.bandMedium", high: "results.dna.bandHigh" },
};

export interface DnaReading {
  axis: DnaAxis;
  /** The number printed. */
  value: number;
  band: Band;
  /** Catalogue key for the word printed beside it. */
  word: Key;
}

/** Every axis that has a value, with the number and the word that go on screen. */
export function readDna(dna: Partial<Record<DnaAxis, number | null>> | null | undefined): DnaReading[] {
  const axes: DnaAxis[] = ["warmth", "depth", "clarity", "contrast"];
  return axes.flatMap((axis) => {
    const raw = dna?.[axis];
    if (typeof raw !== "number" || Number.isNaN(raw)) return [];
    const band = bandOf(raw);
    return [{ axis, value: displayed(raw), band, word: DNA_WORDS[axis][band] }];
  });
}

// ── Shop score ───────────────────────────────────────────────────────────────

/** The headline a shop check leads with: ≥65 suits you, 40-64 might work, <40 not yours. */
export const SHOP_BANDS = { suitsMin: 65, mightMin: 40 } as const;

export type ShopHeadline = "suits" | "might" | "not";

export function shopHeadline(score: number): ShopHeadline {
  const shown = displayed(score);
  if (shown >= SHOP_BANDS.suitsMin) return "suits";
  if (shown >= SHOP_BANDS.mightMin) return "might";
  return "not";
}

export const SHOP_HEADLINE_KEY: Record<ShopHeadline, Key> = {
  suits: "results.shop.headlineSuits",
  might: "results.shop.headlineMight",
  not: "results.shop.headlineNot",
};
