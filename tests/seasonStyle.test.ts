/**
 * The Style tab renders colour, so its data has to be colour — these pin the
 * shape the same way seasonMakeup's tests do.
 */
import { describe, expect, it } from "vitest";
import STYLE, { getSeasonStyle, resolvePairings } from "../server/utils/seasonStyle";
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
    expect(s.story.length).toBeGreaterThan(80);
    for (const g of Object.values(s.guidance)) expect(g.length).toBeGreaterThan(40);
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

/**
 * Guidance and pairings are canonical content, so the things a test *can*
 * check are shape and consistency — whether the sentence is good is a question
 * for design/makeup-review.md.
 */
describe("guidance and pairings", () => {
  it.each(seasons)("%s names the same three metals in the same order", (season) => {
    // A constant order is what lets someone compare two seasons at a glance;
    // sorting by verdict would move the rows around under them.
    const s = getSeasonStyle(season)!;
    expect(s.metals.map((m) => m.name)).toEqual(["Yellow gold", "Rose gold", "Silver"]);
    expect(s.metals.filter((m) => m.verdict === "best").length).toBeGreaterThanOrEqual(1);
  });

  it.each(seasons)("%s keeps metal reasons to about five words", (season) => {
    for (const metal of getSeasonStyle(season)!.metals) {
      const words = metal.reason.trim().split(/\s+/).length;
      expect(words, `${metal.name}: "${metal.reason}"`).toBeGreaterThanOrEqual(3);
      expect(words, `${metal.name}: "${metal.reason}"`).toBeLessThanOrEqual(6);
    }
  });

  it.each(seasons)("%s offers four pairings of three colours each", (season) => {
    const pairings = getSeasonStyle(season)!.pairings;
    expect(pairings).toHaveLength(4);
    for (const p of pairings) {
      expect(p.colours).toHaveLength(3);
      expect(p.when.length).toBeGreaterThan(10);
    }
  });

  it.each(seasons)("%s pairs only colours that exist in its palette", (season) => {
    // A name that does not resolve renders as a gap, which is invisible in
    // review and obvious to a user.
    const palette = getCanonicalPalette(season)!;
    const names = new Set(
      [...palette.best, ...palette.neutrals].map((c) => c.name.toLowerCase())
    );
    const missing = getSeasonStyle(season)!
      .pairings.flatMap((p) => p.colours)
      .filter((c) => !names.has(c.toLowerCase()));
    expect(missing).toEqual([]);
  });

  it.each(seasons)("%s says what to avoid inside the guidance, not beside it", (season) => {
    // The avoid block is gone from Style; the sentence has to carry it.
    expect(getSeasonStyle(season)!.guidance.hair.toLowerCase()).toContain("avoid");
  });

  it("resolves pairings to hexes from the canonical palette", () => {
    const resolved = resolvePairings("Deep Autumn", getCanonicalPalette("Deep Autumn"));
    expect(resolved).toHaveLength(4);
    expect(resolved[0].colours).toHaveLength(3);
    for (const colour of resolved[0].colours) {
      expect(colour.hex).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("drops a pairing whose colour has gone missing rather than showing a gap", () => {
    const thin = { best: [{ name: "Espresso", hex: "#24160F" }], neutrals: [] };
    expect(resolvePairings("Deep Autumn", thin)).toEqual([]);
  });
});
