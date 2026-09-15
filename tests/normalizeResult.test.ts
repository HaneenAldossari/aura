import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeResult } from "../server/routes/analysis";
import { getCanonicalPalette } from "../server/utils/seasonPalettes";

/** A response in the new strict-schema shape. */
function schemaShape(overrides: Record<string, unknown> = {}) {
  return {
    photoIssue: null,
    photoTips: [],
    assessment: {
      undertone: "cool",
      depth: "deep",
      chroma: "clear",
      contrast: "high",
      evidence: "Cool blue-red lips, ash-black hair, stark eye-to-skin contrast.",
    },
    primarySeason: "Deep Winter",
    secondarySeason: "True Winter",
    confidence: 0.88,
    axes: { hue: "cool", value: "dark", chroma: "bright" },
    observations: {
      skin: "Cool porcelain with blue undertone",
      hair: "Blue-black",
      eyes: "Dark brown, clear whites",
      contrast: "Very high",
    },
    rationale: "Depth plus cool undertone plus clarity puts her in Deep Winter.",
    seasonTagline: "Midnight clarity",
    seasonStory: "You wear the deepest, coolest colors best.",
    koreanTone: "딥톤 (Deep Tone)",
    colorDNA: { warmth: 20, depth: 90, clarity: 80, contrast: 85 },
    makeup: {
      foundationTip: "Choose a cool, neutral-pink base.",
      blush: "cool berry",
      bronzer: "skip bronzer; use contour",
      lips: "true red, wine",
      eyes: "charcoal, icy silver",
    },
    jewelryStyle: "Sleek, high-polish, architectural",
    hairColor: {
      bestOverall: "Blue-black or cool espresso",
      bestHighlights: "Ash or cool mahogany",
      avoid: "Golden or caramel tones",
    },
    celebrities: [{ name: "Test Person", why: "Same cool depth" }],
    ...overrides,
  };
}

describe("normalizeResult — new schema shape", () => {
  const result = normalizeResult(schemaShape());

  it("reads primarySeason as the season", () => {
    expect(result.season).toBe("Deep Winter");
  });

  it("rescales 0-1 confidence to the 0-100 the client renders", () => {
    expect(result.confidence).toBe(88);
  });

  it("sources undertone, chroma and contrast from the assessment", () => {
    expect(result.undertone).toBe("cool");
    expect(result.contrastLevel).toBe("high");
    expect(result.chromaLevel).toBe("clear");
  });

  it("builds reasoning and keyFeatures from observations", () => {
    expect(result.reasoning).toContain("Cool porcelain");
    expect(result.reasoning).toContain("Blue-black");
    const kf = result.keyFeatures as Record<string, string>;
    expect(kf.skinTone).toContain("porcelain");
    expect(kf.eyeColor).toContain("Dark brown");
    expect(kf.hairColor).toBe("Blue-black");
  });

  it("uses the canonical palette rather than anything from the model", () => {
    const canonical = getCanonicalPalette("Deep Winter")!;
    const palette = result.palette as Record<string, unknown>;
    expect(palette.best).toEqual(canonical.best);
    expect(palette.avoid).toEqual(canonical.avoid);
    expect((palette.metals as { best: string[] }).best).toEqual(canonical.metals.best);
  });

  it("populates hairColor and jewelry.style, which used to be hardcoded empty", () => {
    const hair = result.hairColor as Record<string, string>;
    expect(hair.bestOverall).toContain("Blue-black");
    expect(hair.bestHighlights).toContain("Ash");
    expect((result.jewelry as Record<string, string>).style).toContain("architectural");
  });

  it("carries the additive classification fields through", () => {
    expect(result.secondarySeason).toBe("True Winter");
    expect(result.axes).toEqual({ hue: "cool", value: "dark", chroma: "bright" });
    expect(result.rationale).toContain("Deep Winter");
    expect((result.assessment as Record<string, string>).evidence).toContain("ash-black");
  });

  it("keeps every field the results page reads non-null", () => {
    // AvoidSection and StyleTab read these without optional chaining.
    const palette = result.palette as Record<string, unknown>;
    expect(Array.isArray(palette.best)).toBe(true);
    expect(Array.isArray(palette.avoid)).toBe(true);
    expect(palette.metals).toBeDefined();
    expect(result.makeup).toBeDefined();
    expect(result.colorDNA).toBeDefined();
  });
});

describe("normalizeResult — legacy fixtures still work", () => {
  const demoDir = path.join(__dirname, "../server/demo-analyses");
  const files = fs.readdirSync(demoDir).filter((f) => f.endsWith(".json"));

  it("finds the demo fixtures", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("normalizes %s without losing client-critical fields", (file) => {
    const raw = JSON.parse(fs.readFileSync(path.join(demoDir, file), "utf8"));
    const result = normalizeResult(raw);

    expect(result.season).toBeTruthy();
    const palette = result.palette as Record<string, unknown>;
    expect(Array.isArray(palette.best)).toBe(true);
    expect(Array.isArray(palette.avoid)).toBe(true);
    expect(typeof result.confidence).toBe("number");
    // Legacy fixtures use "high"/"medium"/"low", never a 0-1 float.
    expect(result.confidence as number).toBeGreaterThan(1);
    expect(result.confidence as number).toBeLessThanOrEqual(100);
  });

  it("maps legacy string confidence", () => {
    expect(normalizeResult({ season: "Deep Winter", confidence: "high" }).confidence).toBe(90);
    expect(normalizeResult({ season: "Deep Winter", confidence: "low" }).confidence).toBe(55);
  });

  it("leaves a legacy 0-100 number untouched", () => {
    expect(normalizeResult({ season: "Deep Winter", confidence: 72 }).confidence).toBe(72);
  });

  it("survives a nearly empty payload", () => {
    const result = normalizeResult({ primarySeason: "Soft Summer" });
    expect(result.season).toBe("Soft Summer");
    expect((result.palette as Record<string, unknown>).best).toBeDefined();
  });
});
