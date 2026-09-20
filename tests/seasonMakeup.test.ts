/**
 * The makeup data layer's contract: the model names shades, the data owns hexes.
 *
 * These exist because that boundary is invisible at runtime — an invented hex
 * renders exactly like a real one, and nothing downstream would ever flag it.
 */
import { describe, expect, it } from "vitest";
import MAKEUP, {
  allShades,
  getSeasonMakeup,
  INDEX_CATEGORIES,
  resolveShade,
  shadeNamesForPrompt,
} from "../server/utils/seasonMakeup";
import { validateLooks } from "../server/normalizeResult";
import STYLE from "../server/utils/seasonStyle";
import fs from "fs";
import path from "path";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";

const seasons = Object.keys(MAKEUP);

describe("canonical makeup shades", () => {
  it("covers exactly the 12 canonical seasons", () => {
    expect(seasons.sort()).toEqual(
      [...CANONICAL_SEASONS].map((s) => s.toLowerCase()).sort()
    );
  });

  it.each(seasons)("%s has every category the UI renders", (season) => {
    const m = getSeasonMakeup(season)!;
    expect(m.foundation.length).toBeGreaterThanOrEqual(5);
    expect(m.undertoneGuide.length).toBeGreaterThan(20);
    expect(m.skip.length).toBeGreaterThan(20);
    for (const c of INDEX_CATEGORIES) {
      const shades = m[c as keyof typeof m] as { name: string }[];
      expect(shades.length, c).toBeGreaterThanOrEqual(3);
      // Nails run to six: the Beauty frame gives them a row of their own, and
      // they are rendered rather than stated so the row has space for it.
      expect(shades.length, c).toBeLessThanOrEqual(c === "nails" ? 6 : 5);
    }
    // Looks need something to pull a fifth bar from.
    expect(m.bronzer.length).toBeGreaterThan(0);
    expect(m.highlight.length).toBeGreaterThan(0);
  });

  it.each(seasons)("%s uses well-formed hexes and correct categories", (season) => {
    const m = getSeasonMakeup(season)!;
    const groups: [string, { hex: string; category: string }[]][] = [
      ["foundation", m.foundation], ["blush", m.blush], ["bronzer", m.bronzer],
      ["lip", m.lip], ["eye", m.eye], ["liner", m.liner],
      ["highlight", m.highlight], ["nails", m.nails],
    ];
    for (const [expected, shades] of groups) {
      for (const s of shades) {
        expect(s.hex, `${expected} ${s.hex}`).toMatch(/^#[0-9A-F]{6}$/);
        expect(s.category).toBe(expected);
      }
    }
  });

  it.each(seasons)("%s has no duplicate shade names within a slot", (season) => {
    const m = getSeasonMakeup(season)!;
    for (const group of [m.blush, m.lip, m.eye, m.liner, m.nails, m.bronzer, m.highlight]) {
      const names = group.map((s) => s.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("offers the prompt every slot a look can fill", () => {
    const text = shadeNamesForPrompt("deep autumn");
    for (const slot of ["eye", "liner", "cheek", "lip", "bronzer", "highlight"]) {
      expect(text).toMatch(new RegExp(`^${slot}: `, "m"));
    }
  });

  it("excludes foundation from the nameable shades", () => {
    // Foundation is a depth ladder, not a shade a look can reach for.
    const names = allShades("deep autumn").map((s) => s.name);
    expect(names).not.toContain("Warm Honey");
    expect(names).toContain("Terracotta");
  });
});

describe("resolveShade", () => {
  it("matches regardless of case and surrounding space", () => {
    expect(resolveShade("deep autumn", "cheek", "  terracotta ")?.hex).toBe("#C0664A");
  });

  it("will not cross slots", () => {
    // "Terracotta" is a blush here; asked for as a lip it must not resolve.
    expect(resolveShade("deep autumn", "lip", "Terracotta")).toBeNull();
  });

  it("will not cross seasons", () => {
    expect(resolveShade("true winter", "cheek", "Terracotta")).toBeNull();
  });
});

describe("validateLooks", () => {
  const look = (shades: [string, string][]) => ({
    name: "Ember Wash",
    vibe: "Warm and lived-in.",
    timeOfDay: "day",
    shades: shades.map(([slot, shade]) => ({ slot, shade })),
  });

  const good: [string, string][] = [
    ["eye", "Antique Bronze"], ["liner", "Espresso"],
    ["cheek", "Terracotta"], ["lip", "Raisin"],
  ];

  it("resolves names to canonical hexes", () => {
    const { looks, dropped } = validateLooks("Deep Autumn", [look(good)]);
    expect(dropped).toEqual([]);
    expect(looks[0].shades.map((s) => s.hex)).toEqual([
      "#8C5A2B", "#24160F", "#C0664A", "#5E2434",
    ]);
    expect(looks[0].shades[0].slot).toBe("eye");
  });

  it("drops a shade that does not exist rather than substituting one", () => {
    const { looks, dropped } = validateLooks("Deep Autumn", [
      look([...good, ["highlight", "Unicorn Dust"]]),
    ]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toContain("Unicorn Dust");
    expect(looks[0].shades).toHaveLength(4);
    expect(looks[0].shades.every((s) => s.name !== "Unicorn Dust")).toBe(true);
  });

  it("drops a look that loses too many shades to read as one", () => {
    const { looks, dropped } = validateLooks("Deep Autumn", [
      look([["eye", "Antique Bronze"], ["lip", "Nope"], ["cheek", "Also Nope"]]),
    ]);
    expect(looks).toEqual([]);
    expect(dropped.join(" ")).toMatch(/only 1 shade/);
  });

  it("keeps at most three looks and five shades each", () => {
    const many: [string, string][] = [
      ...good, ["bronzer", "Warm Chestnut"], ["highlight", "Soft Gold"],
    ];
    const { looks } = validateLooks("Deep Autumn", [look(many), look(many), look(many), look(many)]);
    expect(looks).toHaveLength(3);
    expect(looks[0].shades).toHaveLength(5);
  });

  it("ignores a repeated slot rather than rendering two lips", () => {
    const { looks } = validateLooks("Deep Autumn", [
      look([...good, ["lip", "Deep Brick"]]),
    ]);
    expect(looks[0].shades.filter((s) => s.slot === "lip")).toHaveLength(1);
  });

  it("returns nothing for an unknown season", () => {
    expect(validateLooks("Warm Spring", [look(good)]).looks).toEqual([]);
  });

  it("survives a model that omits looks entirely", () => {
    expect(validateLooks("Deep Autumn", undefined).looks).toEqual([]);
    expect(validateLooks("Deep Autumn", "not an array").looks).toEqual([]);
  });
});


/**
 * Every render a season points at must exist.
 *
 * A missing asset is invisible in review — the name and hex still read fine,
 * and the gap only shows as a broken image on a screen nobody reloaded. The
 * mapping was generated by colour distance, so it is exactly the kind of thing
 * that drifts when a file is renamed.
 */
describe("shade artwork", () => {
  const publicDir = path.join(__dirname, "../client/public/makeup");

  it.each(seasons)("%s: every nail asset is on disk", (season) => {
    const missing = getSeasonMakeup(season)!
      .nails.filter((n) => n.asset && !fs.existsSync(path.join(publicDir, "nails", `${n.asset}.webp`)))
      .map((n) => `${n.name} → ${n.asset}`);
    expect(missing).toEqual([]);
  });

  it.each(seasons)("%s: every gem asset is on disk", (season) => {
    const missing = (STYLE[season].gemstones ?? [])
      .filter((g) => g.asset && !fs.existsSync(path.join(publicDir, "gems", `${g.asset}.webp`)))
      .map((g) => `${g.name} → ${g.asset}`);
    expect(missing).toEqual([]);
  });

  it.each(seasons)("%s: nails carry artwork, other categories do not", (season) => {
    const m = getSeasonMakeup(season)!;
    // The rule the Beauty frame is built on: colours are flat, products render.
    expect(m.nails.every((n) => Boolean(n.asset)), "nails").toBe(true);
    for (const group of [m.blush, m.lip, m.eye, m.liner, m.bronzer, m.highlight, m.foundation]) {
      expect(group.every((s) => s.asset === undefined)).toBe(true);
    }
  });
});
