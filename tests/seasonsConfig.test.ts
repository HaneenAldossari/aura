import { describe, expect, it } from "vitest";
import {
  AXIS_WEIGHTS,
  CHROMA,
  CONTRAST,
  HUE,
  SEASONS,
  SEASON_PROFILES,
  VALUE,
  type Axis,
  type Season,
} from "../measure/seasons.config";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";
import { getCanonicalPalette } from "../server/utils/seasonPalettes";

const AXES: Axis[] = ["hue", "value", "chroma"];

describe("season list stays in sync", () => {
  /**
   * measure/ redeclares the season list so it can run standalone in the browser.
   * That duplication is only safe if it is checked.
   */
  it("matches the server's CANONICAL_SEASONS exactly", () => {
    expect([...SEASONS].sort()).toEqual([...CANONICAL_SEASONS].sort());
  });

  it("every season has a profile and a canonical palette", () => {
    for (const season of SEASONS) {
      expect(SEASON_PROFILES[season], season).toBeDefined();
      expect(getCanonicalPalette(season), season).not.toBeNull();
    }
    expect(Object.keys(SEASON_PROFILES)).toHaveLength(12);
  });
});

describe("axis table structure", () => {
  it("spreads dominance evenly: four seasons per axis", () => {
    const counts: Record<string, number> = {};
    for (const s of SEASONS) counts[SEASON_PROFILES[s].dominant] ??= 0;
    for (const s of SEASONS) counts[SEASON_PROFILES[s].dominant]++;
    expect(counts).toEqual({ hue: 4, value: 4, chroma: 4 });
  });

  it("never makes an axis both dominant and secondary", () => {
    for (const s of SEASONS) {
      const p = SEASON_PROFILES[s];
      expect(p.dominant, s).not.toBe(p.secondary);
    }
  });

  it("keeps every target inside [-1, +1]", () => {
    for (const s of SEASONS) {
      for (const axis of AXES) {
        const v = SEASON_PROFILES[s].target[axis];
        expect(v, `${s}.${axis}`).toBeGreaterThanOrEqual(-1);
        expect(v, `${s}.${axis}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("commits each season strongly to its dominant axis", () => {
    for (const s of SEASONS) {
      const p = SEASON_PROFILES[s];
      expect(Math.abs(p.target[p.dominant]), s).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("gives the four True seasons hue as their dominant axis", () => {
    for (const s of SEASONS) {
      if (s.startsWith("True ")) expect(SEASON_PROFILES[s].dominant, s).toBe("hue");
      else expect(SEASON_PROFILES[s].dominant, s).not.toBe("hue");
    }
  });

  it("places Spring/Autumn warm and Summer/Winter cool", () => {
    for (const s of SEASONS) {
      const hue = SEASON_PROFILES[s].target.hue;
      const warm = s.endsWith("Spring") || s.endsWith("Autumn");
      expect(Math.sign(hue), s).toBe(warm ? 1 : -1);
    }
  });

  /** The classic confusion pairs must differ in hue and nothing else much. */
  it("makes each tonal season a hue-mirror of its opposite-family twin", () => {
    const mirrors: [Season, Season][] = [
      ["Light Spring", "Light Summer"],
      ["Bright Spring", "Bright Winter"],
      ["Soft Autumn", "Soft Summer"],
      ["Deep Autumn", "Deep Winter"],
    ];
    for (const [warm, cool] of mirrors) {
      const w = SEASON_PROFILES[warm];
      const c = SEASON_PROFILES[cool];
      expect(w.dominant, `${warm}/${cool} dominant`).toBe(c.dominant);
      expect(Math.sign(w.target.hue)).toBe(1);
      expect(Math.sign(c.target.hue)).toBe(-1);
      // Same pole on the shared dominant axis.
      expect(Math.sign(w.target[w.dominant])).toBe(Math.sign(c.target[c.dominant]));
    }
  });

  it("gives no two seasons the same target point", () => {
    const seen = new Set(
      SEASONS.map((s) => AXES.map((a) => SEASON_PROFILES[s].target[a]).join(","))
    );
    expect(seen.size).toBe(12);
  });
});

describe("thresholds are internally coherent", () => {
  it("weights dominant above secondary above the rest", () => {
    expect(AXIS_WEIGHTS.dominant).toBeGreaterThan(AXIS_WEIGHTS.secondary);
    expect(AXIS_WEIGHTS.secondary).toBeGreaterThan(AXIS_WEIGHTS.remaining);
  });

  it("uses positive spans everywhere, so normalisation cannot invert", () => {
    for (const group of [HUE, VALUE, CHROMA]) {
      for (const region of ["skin", "eyes", "hair"] as const) {
        const band = (group as Record<string, unknown>)[region] as
          | { span: number }
          | undefined;
        if (band) expect(band.span).toBeGreaterThan(0);
      }
    }
  });

  it("gives each axis region weights that sum to 1", () => {
    for (const [name, w] of [
      ["hue", HUE.weights],
      ["value", VALUE.weights],
      ["chroma", CHROMA.weights],
    ] as const) {
      const sum = (Object.values(w) as number[]).reduce((a, b) => a + b, 0);
      expect(sum, name).toBeCloseTo(1, 5);
    }
  });

  it("orders the label breakpoints correctly", () => {
    expect(HUE.labels.cool).toBeLessThan(HUE.labels.neutralCool);
    expect(HUE.labels.neutralCool).toBeLessThan(HUE.labels.neutralWarm);
    expect(VALUE.labels.dark).toBeLessThan(VALUE.labels.light);
    expect(CHROMA.labels.soft).toBeLessThan(CHROMA.labels.bright);
    expect(CONTRAST.labels.low).toBeLessThan(CONTRAST.labels.high);
  });

  it("only expects unusual contrast from seasons that genuinely depend on it", () => {
    for (const season of Object.keys(CONTRAST.expects) as Season[]) {
      expect(SEASONS, season).toContain(season);
    }
    expect(CONTRAST.expects["Soft Summer"]).toBe("low");
    expect(CONTRAST.expects["Bright Winter"]).toBe("high");
  });

  it("keeps contrast a tiebreaker, not a fourth axis", () => {
    expect(CONTRAST.adjustmentStrength).toBeLessThan(AXIS_WEIGHTS.remaining / 2);
  });
});
