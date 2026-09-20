/**
 * The Style tab renders colour, so its data has to be colour — these pin the
 * shape the same way seasonMakeup's tests do.
 */
import { describe, expect, it } from "vitest";
import STYLE, { getSeasonStyle } from "../server/utils/seasonStyle";
import { getCanonicalPalette } from "../server/utils/seasonPalettes";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";

const seasons = Object.keys(STYLE);

describe("canonical style data", () => {
  it("covers exactly the 12 canonical seasons", () => {
    expect(seasons.sort()).toEqual([...CANONICAL_SEASONS].map((s) => s.toLowerCase()).sort());
  });

  it.each(seasons)("%s has stones, hair and a metal note", (season) => {
    const s = getSeasonStyle(season)!;
    expect(s.gemstones.length).toBeGreaterThanOrEqual(3);
    expect(s.hair.length).toBeGreaterThanOrEqual(3);
    expect(s.metalNote.length).toBeGreaterThan(20);
  });

  it.each(seasons)("%s uses well-formed two-tone hexes", (season) => {
    const s = getSeasonStyle(season)!;
    for (const shade of [...s.gemstones, ...s.hair]) {
      expect(shade.hex, shade.name).toMatch(/^#[0-9A-F]{6}$/);
      expect(shade.accent, shade.name).toMatch(/^#[0-9A-F]{6}$/);
      // A two-tone swatch with one colour is just a swatch.
      expect(shade.accent).not.toBe(shade.hex);
    }
  });

  it.each(seasons)("%s does not recommend a metal it also says to avoid", (season) => {
    const metals = getCanonicalPalette(season)!.metals;
    const best = new Set(metals.best.map((m) => m.toLowerCase()));
    for (const avoided of metals.avoid) {
      expect(best.has(avoided.toLowerCase()), `${season}: ${avoided}`).toBe(false);
    }
  });
});
