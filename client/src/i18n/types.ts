/**
 * Catalogue typing.
 *
 * English is the source of truth: `Catalogue` is derived from it, so adding a
 * string to en.ts is the only way to create a key. Translations are deep-partial
 * against that shape — a missing Arabic string falls back to English at runtime,
 * but a *misspelt* Arabic key is a compile error. That is the trade the sprint
 * asked for: the scaffold lands now, Arabic fills in later, and neither half can
 * drift from the other unnoticed.
 */

import type { en } from "./en";

export type Catalogue = typeof en;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? T[K] : DeepPartial<T[K]>;
};

/**
 * Every dotted path through the catalogue that ends at a string.
 *
 * Recursion depth is bounded by the catalogue itself (three levels), so this
 * stays cheap for the compiler.
 */
export type Key<T = Catalogue> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Key<T[K]>}`;
}[keyof T & string];

export type Locale = "en" | "ar";

/** Values substituted into {placeholders}. */
export type Vars = Record<string, string | number>;
