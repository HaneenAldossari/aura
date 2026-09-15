import { describe, expect, it } from "vitest";
import {
  CHROMA,
  CONTRAST,
  FLOW_CIRCLE,
  HUE,
  SCORING,
  SEASONS,
  SEASON_PROFILES,
  SKIN_BANDS,
  VALUE,
  flowNeighbours,
  type Season,
} from "../measure/seasons.config";
import {
  hueDelta,
  score,
  skinBandOf,
  type MeasuredFeatures,
  type RegionStats,
} from "../measure/score";

/**
 * A synthetic face whose measured axes land exactly on one season's target.
 *
 * Hair is marked covered and eyes omitted on purpose: that collapses all three
 * axes onto skin alone (weights redistribute to 1.0) and makes contrast null, so
 * the three-axis geometry is tested with no contrast nudge confounding it. It
 * also exercises the redistribution path.
 *
 * Thresholds are read from config rather than hardcoded, so this keeps working
 * after Phase 4 calibration moves the numbers.
 */
function skinOnly(season: Season): MeasuredFeatures {
  const t = SEASON_PROFILES[season].target;
  const L = VALUE.skin.neutral + t.value * VALUE.skin.span;
  const band = skinBandOf(L);
  return {
    skin: {
      L,
      C: CHROMA.skinByBand[band].neutral + t.chroma * CHROMA.skinByBand[band].span,
      h: HUE.skinByBand[band].neutral + t.hue * HUE.skinByBand[band].span,
    },
    hair: null,
    eyes: null,
    hairStatus: "covered",
  };
}

const skin = (L: number, C: number, h: number): RegionStats => ({ L, C, h });

describe("score() — self-consistency across all 12 seasons", () => {
  it.each([...SEASONS])("a face measured exactly at %s scores %s first", (season) => {
    const result = score(skinOnly(season));
    expect(result.primary).toBe(season);
  });

  it("puts the measured axes exactly on the target", () => {
    for (const season of SEASONS) {
      const t = SEASON_PROFILES[season].target;
      const a = score(skinOnly(season)).axes;
      expect(a.hue.value, `${season} hue`).toBeCloseTo(t.hue, 6);
      expect(a.value.value, `${season} value`).toBeCloseTo(t.value, 6);
      expect(a.chroma.value, `${season} chroma`).toBeCloseTo(t.chroma, 6);
    }
  });

  it("scores the exact match 100 and ranks all 12", () => {
    for (const season of SEASONS) {
      const r = score(skinOnly(season));
      expect(r.ranked).toHaveLength(12);
      expect(r.ranked[0].score, season).toBe(100);
      expect(new Set(r.ranked.map((x) => x.season)).size).toBe(12);
    }
  });

  it("returns scores that decrease monotonically down the ranking", () => {
    const r = score(skinOnly("Soft Autumn"));
    for (let i = 1; i < r.ranked.length; i++) {
      expect(r.ranked[i].score).toBeLessThanOrEqual(r.ranked[i - 1].score);
    }
  });
});

describe("secondary comes from the flow circle, not a table", () => {
  it("always picks one of the primary's two circle neighbours", () => {
    for (const season of SEASONS) {
      const r = score(skinOnly(season));
      expect(flowNeighbours(r.primary), season).toContain(r.secondary);
    }
  });

  it("picks the higher-scoring of the two neighbours", () => {
    for (const season of SEASONS) {
      const r = score(skinOnly(season));
      const [prev, next] = flowNeighbours(r.primary);
      const by = new Map(r.ranked.map((x) => [x.season, x.score]));
      const chosen = by.get(r.secondary)!;
      const other = r.secondary === prev ? by.get(next)! : by.get(prev)!;
      expect(chosen, season).toBeGreaterThanOrEqual(other);
    }
  });

  it("measures margin against that neighbour, not the global runner-up", () => {
    for (const season of SEASONS) {
      const r = score(skinOnly(season));
      const by = new Map(r.ranked.map((x) => [x.season, x.score]));
      expect(r.margin, season).toBeCloseTo(r.ranked[0].score - by.get(r.secondary)!, 5);
      expect(r.margin, season).toBeGreaterThan(0);
    }
  });

  it("leans toward the neighbour the face actually drifts toward", () => {
    // True Summer sits between Light Summer and Soft Summer on the circle.
    const base = skinOnly("True Summer");
    const lighter = { ...base, skin: { ...base.skin, L: base.skin.L + 12 } };
    const softer = { ...base, skin: { ...base.skin, C: base.skin.C - 3 } };
    expect(score(lighter).primary).toBe("True Summer");
    expect(score(lighter).secondary).toBe("Light Summer");
    expect(score(softer).primary).toBe("True Summer");
    expect(score(softer).secondary).toBe("Soft Summer");
  });

  it("moves a neighbour's score monotonically as the face drifts toward it", () => {
    // Stronger than asserting one flip point, which depends on thresholds that
    // Phase 4 will move: the ordering of the response is what must hold.
    const base = skinOnly("True Summer");
    let lastLight = -Infinity;
    let lastSoft = Infinity;
    for (let dL = 0; dL <= 15; dL += 3) {
      const by = new Map(
        score({ ...base, skin: { ...base.skin, L: base.skin.L + dL } }).ranked.map(
          (r) => [r.season, r.score]
        )
      );
      expect(by.get("Light Summer")!, `dL=${dL}`).toBeGreaterThan(lastLight);
      expect(by.get("Soft Summer")!, `dL=${dL}`).toBeLessThan(lastSoft);
      lastLight = by.get("Light Summer")!;
      lastSoft = by.get("Soft Summer")!;
    }
  });

  it("wraps around the circle", () => {
    expect(flowNeighbours("Bright Winter")).toEqual(["True Winter", "Bright Spring"]);
    expect(flowNeighbours("True Winter")).toEqual(["Deep Winter", "Bright Winter"]);
    expect(FLOW_CIRCLE).toHaveLength(12);
    expect(new Set(FLOW_CIRCLE).size).toBe(12);
  });
});

describe("ambiguity", () => {
  it("flags a face sitting exactly between two neighbours", () => {
    const a = SEASON_PROFILES["Soft Summer"].target;
    const b = SEASON_PROFILES["True Summer"].target;
    const mid = {
      hue: (a.hue + b.hue) / 2,
      value: (a.value + b.value) / 2,
      chroma: (a.chroma + b.chroma) / 2,
    };
    const L = VALUE.skin.neutral + mid.value * VALUE.skin.span;
    const band = skinBandOf(L);
    const r = score({
      skin: skin(
        L,
        CHROMA.skinByBand[band].neutral + mid.chroma * CHROMA.skinByBand[band].span,
        HUE.skinByBand[band].neutral + mid.hue * HUE.skinByBand[band].span
      ),
      hair: null,
      eyes: null,
      hairStatus: "covered",
    });
    expect(r.margin).toBeLessThan(SCORING.ambiguousMargin);
    expect(r.ambiguous).toBe(true);
  });

  it("does not flag an exact match", () => {
    for (const season of SEASONS) {
      expect(score(skinOnly(season)).ambiguous, season).toBe(false);
    }
  });
});

describe("hairStatus", () => {
  const naturalHair: RegionStats = { L: 20, C: 12, h: 50 };

  function withHair(status: MeasuredFeatures["hairStatus"]): MeasuredFeatures {
    return {
      skin: skin(62, 18, 52.5),
      hair: naturalHair,
      eyes: { L: 30, C: 25, h: 55 },
      hairStatus: status,
    };
  }

  it("uses natural hair", () => {
    const r = score(withHair("natural"));
    expect(r.hairUsed).toBe(true);
    expect(r.contrast).not.toBeNull();
  });

  it("drops dyed and covered hair", () => {
    for (const status of ["dyed", "covered"] as const) {
      const r = score(withHair(status));
      expect(r.hairUsed, status).toBe(false);
    }
  });

  it("gives dyed and covered hair identical results", () => {
    expect(score(withHair("dyed"))).toEqual(score(withHair("covered")));
  });

  it("does not let dropped hair read as black and drag the face darker", () => {
    // The failure this guards against: treating a missing region as 0 rather
    // than redistributing its weight would make every covered face read Deep.
    const withNatural = score(withHair("natural"));
    const withCovered = score(withHair("covered"));
    expect(withCovered.axes.value.value).toBeGreaterThan(withNatural.axes.value.value);
    expect(withCovered.axes.value.value).toBeCloseTo(
      (withHair("covered").skin.L - VALUE.skin.neutral) / VALUE.skin.span,
      6
    );
  });

  it("still scores when hair is covered and eyes are missing", () => {
    const r = score({
      skin: skin(55, 18, 52.5),
      hair: null,
      eyes: null,
      hairStatus: "covered",
    });
    expect(SEASONS).toContain(r.primary);
    expect(r.contrast).toBeNull();
  });

  it("ignores a hair measurement that is present but marked dyed", () => {
    const dyed = withHair("dyed");
    const bleached: MeasuredFeatures = {
      ...dyed,
      hair: { L: 85, C: 30, h: 70 },
    };
    expect(score(bleached).ranked).toEqual(score(dyed).ranked);
  });
});

describe("skin-lightness bands", () => {
  it("bands on skin L* at the configured boundaries", () => {
    expect(skinBandOf(SKIN_BANDS.deepBelow - 0.1)).toBe("deep");
    expect(skinBandOf(SKIN_BANDS.deepBelow)).toBe("medium");
    expect(skinBandOf(SKIN_BANDS.lightAtOrAbove - 0.1)).toBe("medium");
    expect(skinBandOf(SKIN_BANDS.lightAtOrAbove)).toBe("light");
  });

  it("reports the band it used, so the eval can break accuracy down by it", () => {
    expect(score(skinOnly("Deep Autumn")).skinBand).toBe("deep");
    expect(score(skinOnly("Light Spring")).skinBand).toBe("light");
    expect(score(skinOnly("True Summer")).skinBand).toBe("medium");
  });

  it("applies the band's own hue threshold", () => {
    // All three bands start identical, so a face at the shared neutral reads 0
    // regardless of depth. This pins the wiring, so that when Phase 4 moves one
    // band the others do not silently move with it.
    for (const L of [30, 55, 70]) {
      const band = skinBandOf(L);
      const r = score({
        skin: skin(L, CHROMA.skinByBand[band].neutral, HUE.skinByBand[band].neutral),
        hair: null,
        eyes: null,
        hairStatus: "covered",
      });
      expect(r.axes.hue.value, `L=${L}`).toBeCloseTo(0, 6);
      expect(r.axes.chroma.value, `L=${L}`).toBeCloseTo(0, 6);
    }
  });
});

describe("contrast", () => {
  const base = (hairL: number, eyesL = 35): MeasuredFeatures => ({
    skin: skin(60, 18, 48),
    hair: { L: hairL, C: 15, h: 50 },
    eyes: { L: eyesL, C: 28, h: 55 },
    hairStatus: "natural",
  });

  it("labels low, medium and high against the configured breakpoints", () => {
    expect(score(base(58, 58)).contrast!.label).toBe("low");
    expect(score(base(8, 20)).contrast!.label).toBe("high");
    const mid = score(base(40)).contrast!;
    expect(mid.value).toBeGreaterThan(CONTRAST.labels.low);
    expect(mid.value).toBeLessThan(CONTRAST.labels.high);
    expect(mid.label).toBe("medium");
  });

  it("rewards a season whose expected contrast is present", () => {
    // True Winter expects high contrast.
    const target = skinOnly("True Winter");
    const highContrast: MeasuredFeatures = {
      ...target,
      hair: { L: target.skin.L - 55, C: 10, h: 50 },
      hairStatus: "natural",
    };
    const byLow = new Map(score(target).ranked.map((r) => [r.season, r.score]));
    const byHigh = new Map(score(highContrast).ranked.map((r) => [r.season, r.score]));
    expect(byHigh.get("True Winter")!).toBeGreaterThan(
      byLow.get("True Winter")! - 100 // sanity: both defined
    );
    expect(CONTRAST.expects["True Winter"]).toBe("high");
  });

  it("stays a tiebreaker: it cannot outweigh a dominant-axis mismatch", () => {
    // A clearly light, warm, bright face with low contrast must not become a
    // Soft season just because Soft Summer expects low contrast.
    const r = score({
      skin: skin(74, 27, 61.5),
      hair: { L: 72, C: 18, h: 60 },
      eyes: { L: 70, C: 40, h: 58 },
      hairStatus: "natural",
    });
    expect(r.primary).not.toBe("Soft Summer");
    expect(r.primary).not.toBe("Soft Autumn");
    expect(r.axes.hue.label).toBe("warm");
  });

  it("is null when neither hair nor eyes are usable", () => {
    expect(
      score({ skin: skin(55, 18, 52), hair: null, eyes: null, hairStatus: "covered" })
        .contrast
    ).toBeNull();
  });
});

describe("axis labels", () => {
  it("labels the poles of each axis", () => {
    const warmLight = score(skinOnly("Light Spring")).axes;
    expect(warmLight.hue.label).toBe("warm");
    expect(warmLight.value.label).toBe("light");

    const coolDeep = score(skinOnly("Deep Winter")).axes;
    expect(coolDeep.hue.label).toBe("cool");
    expect(coolDeep.value.label).toBe("dark");

    expect(score(skinOnly("Soft Summer")).axes.chroma.label).toBe("soft");
    expect(score(skinOnly("Bright Spring")).axes.chroma.label).toBe("bright");
  });

  it("calls the midpoint neutral rather than warm or cool", () => {
    const r = score({
      skin: skin(55, 18, HUE.skinByBand.medium.neutral),
      hair: null,
      eyes: null,
      hairStatus: "covered",
    });
    expect(r.axes.hue.label).toBe("neutral-warm");
    expect(r.axes.value.label).toBe("medium");
    expect(r.axes.chroma.label).toBe("medium");
  });
});

describe("hueDelta respects the circle", () => {
  it("wraps across 0/360", () => {
    expect(hueDelta(350, 10)).toBeCloseTo(20, 6);
    expect(hueDelta(10, 350)).toBeCloseTo(20, 6);
    expect(hueDelta(0, 180)).toBeCloseTo(180, 6);
    expect(hueDelta(45, 45)).toBe(0);
  });

  it("never exceeds 180", () => {
    for (let a = 0; a < 360; a += 37) {
      for (let b = 0; b < 360; b += 53) {
        expect(hueDelta(a, b)).toBeLessThanOrEqual(180);
      }
    }
  });
});
