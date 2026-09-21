/**
 * The flag holding the colour field back.
 *
 * A flag is a promise that the code still works. These check the field has not
 * quietly rotted while switched off — it still compiles into the app, its data
 * ordering is intact, and its acceptance suite still exists.
 *
 * The hero around it was rebuilt from the Lovable landing page, so the old
 * type ladder that made room for the field is gone: turning the flag on now
 * needs a layout pass as well as the one line. The landing page itself is
 * covered by homeLanding.test.ts.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { SHOW_COLOUR_FIELD } from "../client/src/lib/flags";
import { fieldPalettes, FIELD_ORDER } from "../server/utils/seasonPalettes";

const SRC = path.join(__dirname, "../client/src");
const hero = fs.readFileSync(path.join(SRC, "pages/home/Hero.tsx"), "utf8");

describe("the flagged-off colour field", () => {
  it("renders only behind the flag", () => {
    expect(hero).toMatch(/SHOW_COLOUR_FIELD \? \(/);
  });

  it("is still wired up, lazily, so it costs the Home bundle nothing while off", () => {
    expect(hero).toMatch(/lazy\(\(\) => import\("\.\/ColourField"\)\)/);
    expect(fs.existsSync(path.join(SRC, "pages/home/ColourField.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(SRC, "pages/home/colour-field.css"))).toBe(true);
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
