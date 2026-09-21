/**
 * The hero, and the flag holding the colour field back.
 *
 * A flag is a promise that the code still works. These check the field has not
 * quietly rotted while switched off — it still compiles into the bundle, its
 * data ordering is intact, and its acceptance suite still exists — so turning
 * it on is one line rather than an archaeology project.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { SHOW_COLOUR_FIELD } from "../client/src/lib/flags";
import { fieldPalettes, FIELD_ORDER } from "../server/utils/seasonPalettes";

const SRC = path.join(__dirname, "../client/src");
const home = fs.readFileSync(path.join(SRC, "pages/Home.tsx"), "utf8");
const css = fs.readFileSync(path.join(SRC, "pages/home/home-editorial.css"), "utf8");

describe("hero", () => {
  it("renders the field only behind the flag", () => {
    expect(home).toMatch(/SHOW_COLOUR_FIELD && \(/);
  });

  it("marks the page so the field's tighter type ladder only applies with it", () => {
    // Without the field there is room for the headline the design asked for.
    expect(home).toMatch(/SHOW_COLOUR_FIELD \? " has-field" : ""/);
    expect(css).toMatch(/#home\.has-field \{ --h1: 96px/);
    expect(css).toMatch(/@media \(min-width: 1024px\) and \(max-height: 850px\)\s+\{ #home \{ --h1: 72px/);
  });

  it("does not run the field's scroll fade when the field is absent", () => {
    expect(home).toMatch(/if \(!SHOW_COLOUR_FIELD \|\| !el\) return;/);
  });

  it("keeps the how-it-works label clear of the column rules", () => {
    // At 8px the label's descenders sat on the rule and it read as a caption
    // belonging to the first column rather than a heading over all three.
    expect(css).toMatch(/\.how-it-works \.ed-section__label \{ margin-block-end: var\(--space-4\);/);
  });
});

describe("the flagged-off colour field", () => {
  it("is still wired up, so the flag is the only thing switching it off", () => {
    expect(home).toMatch(/import ColourField from "\.\/home\/ColourField"/);
    expect(fs.existsSync(path.join(SRC, "pages/home/ColourField.tsx"))).toBe(true);
  });

  it("keeps its flow-circle ordering and twelve full palettes", () => {
    const bands = fieldPalettes();
    expect(bands).toHaveLength(12);
    expect(bands.map((b) => b.season)).toEqual([...FIELD_ORDER]);
    for (const band of bands) expect(band.palette.best.length).toBeGreaterThanOrEqual(12);
  });

  it("keeps its acceptance suite", () => {
    expect(fs.existsSync(path.join(__dirname, "../scripts/dev/_hero.ts"))).toBe(true);
  });

  it("is currently off", () => {
    // If this ever needs changing, change the flag — not the test.
    expect(SHOW_COLOUR_FIELD).toBe(false);
  });
});
