/**
 * The label shown always matches the number shown.
 *
 * Colour DNA prints "Contrast 78 · high" and the trait line above it prints
 * "Contrast: High". Both words used to come from somewhere other than the 78 —
 * the measurement layer's axis labels, or the model's prose — so they could,
 * and did, disagree with it. Now one banding in client/src/lib/bands.ts turns
 * the displayed integer into the word, for every readout.
 *
 * These go at it from three sides: the function over every value, the real
 * precomputed analyses, and the components' source — because a correct
 * function that a component does not call proves nothing.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  bandOf,
  displayed,
  DNA_BANDS,
  DNA_WORDS,
  readDna,
  SHOP_BANDS,
  shopHeadline,
  type Band,
  type DnaAxis,
} from "../client/src/lib/bands";
import { en } from "../client/src/i18n/en";

const AXES: DnaAxis[] = ["warmth", "depth", "clarity", "contrast"];

/** The rule as the brief states it, written out independently of the implementation. */
function expectedBand(shown: number): Band {
  if (shown <= 35) return "low";
  if (shown >= 65) return "high";
  return "medium";
}

/** Resolve a catalogue key like "results.dna.bandHigh" to its English string. */
function word(key: string): string {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], en) as string;
}

describe("one banding: ≤35 low, 36-64 medium, ≥65 high", () => {
  it("has the thresholds the brief gives", () => {
    expect(DNA_BANDS).toEqual({ lowMax: 35, highMin: 65 });
  });

  it("bands every displayable value correctly, on every axis", () => {
    for (let v = 0; v <= 100; v++) {
      expect(bandOf(v), String(v)).toBe(expectedBand(v));
      for (const axis of AXES) {
        const [row] = readDna({ [axis]: v });
        expect(row.value).toBe(v);
        expect(row.band).toBe(expectedBand(v));
        expect(row.word).toBe(DNA_WORDS[axis][expectedBand(v)]);
      }
    }
  });

  it("bands the number the reader sees, not the fraction behind it", () => {
    // 35.4 is printed as 35, so it must read low; 35.5 is printed as 36, medium.
    // Banding the raw value instead gives "36 · low", the very bug this removes.
    for (let raw = 0; raw <= 100; raw += 0.1) {
      const [row] = readDna({ contrast: raw });
      expect(row.band, raw.toFixed(1)).toBe(expectedBand(row.value));
      expect(row.value).toBe(displayed(raw));
    }
    expect(readDna({ depth: 35.4 })[0]).toMatchObject({ value: 35, band: "low" });
    expect(readDna({ depth: 35.5 })[0]).toMatchObject({ value: 36, band: "medium" });
    expect(readDna({ depth: 64.4 })[0]).toMatchObject({ value: 64, band: "medium" });
    expect(readDna({ depth: 64.5 })[0]).toMatchObject({ value: 65, band: "high" });
  });

  it("clamps out-of-range values before banding, and skips axes with no value", () => {
    expect(readDna({ warmth: -20 })[0]).toMatchObject({ value: 0, band: "low" });
    expect(readDna({ warmth: 140 })[0]).toMatchObject({ value: 100, band: "high" });
    expect(readDna({ warmth: null, depth: undefined, clarity: NaN })).toEqual([]);
    expect(readDna(undefined)).toEqual([]);
  });

  it("gives every axis three distinct words, all in the catalogue", () => {
    for (const axis of AXES) {
      const words = (["low", "medium", "high"] as Band[]).map((b) => word(DNA_WORDS[axis][b]));
      expect(new Set(words).size, axis).toBe(3);
      for (const w of words) expect(w, axis).toMatch(/^[a-z]+$/);
    }
    expect(word(DNA_WORDS.warmth.low)).toBe("cool");
    expect(word(DNA_WORDS.warmth.high)).toBe("warm");
    expect(word(DNA_WORDS.depth.high)).toBe("deep");
    expect(word(DNA_WORDS.clarity.low)).toBe("soft");
  });
});

describe("on the real precomputed analyses", () => {
  const dir = path.join(__dirname, "../server/demo-analyses");
  const files = fs.readdirSync(dir).filter((f) => /^sample-\d+\.json$/.test(f));

  it("there are some", () => expect(files.length).toBeGreaterThan(0));

  it.each(files)("%s: every printed label matches its printed number", (file) => {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const result = data.result ?? data;
    const rows = readDna(result.colorDNA);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.band, `${row.axis} ${row.value}`).toBe(expectedBand(row.value));
      expect(word(row.word)).toBe(word(DNA_WORDS[row.axis][expectedBand(row.value)]));
    }
  });
});

describe("the components use it, and nothing else", () => {
  const read = (file: string) =>
    fs.readFileSync(path.join(__dirname, "../client/src/pages/results", file), "utf8");

  it("ColourDNA prints the value and the word from the same reading", () => {
    const src = read("ColourDNA.tsx");
    expect(src).toMatch(/readDna\(data\.colorDNA\)/);
    expect(src).toMatch(/\{row\.value\} · \{t\(row\.word\)\}/);
    // The old sources: the measurement layer's label, and the model's prose.
    expect(src).not.toMatch(/axes\?\.\w+\?\.label|contrast\?\.label|data\.undertone|data\.contrastLevel|data\.chroma|data\.depth\b/);
  });

  it("TraitLine takes undertone and contrast from the same banding when there is a number", () => {
    const src = read("TraitLine.tsx");
    expect(src).toMatch(/readDna\(data\.colorDNA\)/);
    expect(src).toMatch(/warmth \? capitalise\(t\(warmth\.word\)\)/);
    expect(src).toMatch(/contrast \? capitalise\(t\(contrast\.word\)\)/);
    expect(src).not.toMatch(/axes\?\.hue\?\.label|contrast\?\.label/);
  });
});

describe("shop headline: ≥65 suits you, 40-64 might work, <40 not your colour", () => {
  it("has the thresholds the brief gives", () => {
    expect(SHOP_BANDS).toEqual({ suitsMin: 65, mightMin: 40 });
  });

  it("matches the score printed under it, for every score", () => {
    for (let score = 0; score <= 100; score += 0.5) {
      const shown = displayed(score);
      const expected = shown >= 65 ? "suits" : shown >= 40 ? "might" : "not";
      expect(shopHeadline(score), String(score)).toBe(expected);
    }
    expect(shopHeadline(72)).toBe("suits");
    expect(shopHeadline(39.4)).toBe("not");
    expect(shopHeadline(39.5)).toBe("might");
  });

  it("says it in the agreed words", () => {
    expect(en.results.shop.headlineSuits).toBe("Suits you");
    expect(en.results.shop.headlineMight).toBe("Might work");
    expect(en.results.shop.headlineNot).toBe("Not your colour");
  });

  it("the panel reads score, verdict, reason, tip, then the evidence — all visible", () => {
    const src = fs.readFileSync(path.join(__dirname, "../client/src/pages/results/BeforeYouBuyPanel.tsx"), "utf8");
    expect(src).toMatch(/shopHeadline\(result\.matchScore\)/);
    const order = ['className="ed-score"', 'className="ed-verdict"', "ed-verdictcard__reason", "ed-verdictcard__tip", 'className="ed-evidence"']
      .map((marker) => src.indexOf(marker));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // No legend of score bands, and nothing behind a toggle.
    expect(src).not.toMatch(/ed-bands|ed-band\b|aria-expanded|hidden=\{|showDetails|hideDetails/);
    // The two pieces of evidence: product against nearest, and three closer.
    expect(src).toMatch(/results\.shop\.against/);
    expect(src).toMatch(/similarColors\.slice\(0, 3\)/);
  });
});
