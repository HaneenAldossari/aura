import { describe, expect, it } from "vitest";
import {
  DISAGREEMENT_CONFIDENCE_CAP,
  computeAgreement,
  describeFeatures,
  rankSeasons,
  validateFeatures,
} from "../server/services/hybrid";
import { SEASONS } from "../measure/seasons.config";
import type { MeasuredFeatures } from "../measure/score";

const VALID: MeasuredFeatures = {
  skin: { L: 62, C: 22, h: 52 },
  hair: { L: 24, C: 8, h: 50 },
  eyes: { L: 30, C: 18, h: 60 },
  hairStatus: "natural",
};

describe("validateFeatures — untrusted client input", () => {
  it("accepts a well-formed payload", () => {
    const result = validateFeatures(VALID);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.features.skin.L).toBe(62);
  });

  it("accepts null hair and eyes", () => {
    const result = validateFeatures({ ...VALID, hair: null, eyes: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.features.hair).toBeNull();
      expect(result.features.eyes).toBeNull();
    }
  });

  it("rejects a missing skin region", () => {
    const result = validateFeatures({ ...VALID, skin: undefined });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/skin/);
  });

  it.each([
    ["L below range", { L: -1, C: 20, h: 50 }],
    ["L above range", { L: 101, C: 20, h: 50 }],
    ["negative chroma", { L: 60, C: -5, h: 50 }],
    ["absurd chroma", { L: 60, C: 5000, h: 50 }],
    ["hue below range", { L: 60, C: 20, h: -10 }],
    ["hue above range", { L: 60, C: 20, h: 400 }],
    ["NaN", { L: Number.NaN, C: 20, h: 50 }],
    ["Infinity", { L: Number.POSITIVE_INFINITY, C: 20, h: 50 }],
  ])("rejects %s", (_label, skin) => {
    expect(validateFeatures({ ...VALID, skin }).ok).toBe(false);
  });

  it("rejects an unknown hair status", () => {
    expect(validateFeatures({ ...VALID, hairStatus: "bleached" }).ok).toBe(false);
    expect(validateFeatures({ ...VALID, hairStatus: undefined }).ok).toBe(false);
  });

  it("rejects non-objects outright", () => {
    for (const bad of [null, undefined, "features", 42, []]) {
      expect(validateFeatures(bad).ok, String(bad)).toBe(false);
    }
  });

  it("coerces numeric strings rather than failing on them", () => {
    const result = validateFeatures({ ...VALID, skin: { L: "62", C: "22", h: "52" } });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.features.skin.L).toBe(62);
  });
});

describe("computeAgreement", () => {
  const rules = rankSeasons(VALID);

  it("agrees when the model matches the rules' primary", () => {
    const a = computeAgreement(rules, rules.primary);
    expect(a.level).toBe("primary");
    expect(a.agrees).toBe(true);
    expect(a.confidenceCap).toBe(1);
    expect(a.needsSecondPhoto).toBe(false);
  });

  it("agrees when the model matches the flow-circle secondary", () => {
    const a = computeAgreement(rules, rules.secondary);
    expect(a.level).toBe("secondary");
    expect(a.agrees).toBe(true);
    expect(a.confidenceCap).toBe(1);
  });

  it("caps confidence and suggests a second photo on a real disagreement", () => {
    const unrelated = SEASONS.find(
      (s) => s !== rules.primary && s !== rules.secondary
    )!;
    const a = computeAgreement(rules, unrelated);
    expect(a.level).toBe("none");
    expect(a.agrees).toBe(false);
    expect(a.confidenceCap).toBe(DISAGREEMENT_CONFIDENCE_CAP);
    expect(a.needsSecondPhoto).toBe(true);
    expect(a.alternatives.length).toBeGreaterThan(0);
    expect(a.alternatives[0].season).toBe(rules.primary);
  });

  it("matches season names case-insensitively and ignores surrounding space", () => {
    expect(computeAgreement(rules, `  ${rules.primary.toUpperCase()} `).level).toBe("primary");
  });

  it("treats an unrecognised or missing season as disagreement, not a crash", () => {
    for (const bad of [undefined, null, "", "Soft Spring", 42]) {
      const a = computeAgreement(rules, bad);
      expect(a.level, String(bad)).toBe("none");
      expect(a.needsSecondPhoto).toBe(true);
    }
  });

  it("always reports the rule-based verdict for the eval", () => {
    const a = computeAgreement(rules, rules.primary);
    expect(SEASONS).toContain(a.rulesPrimary);
    expect(SEASONS).toContain(a.rulesSecondary);
    expect(a.rulesMargin).toBeGreaterThanOrEqual(0);
  });
});

describe("describeFeatures — what the model is shown", () => {
  const rules = rankSeasons(VALID);
  const text = describeFeatures(VALID, rules.axes);

  /**
   * The whole point of computing agreement afterwards. A model shown the
   * rule-based answer would anchor on it, and the check would be measuring its
   * own suggestion rather than an independent verdict.
   */
  it("never names a season", () => {
    for (const season of SEASONS) {
      expect(text, season).not.toContain(season);
    }
  });

  it("never leaks a ranking or a score", () => {
    expect(text).not.toMatch(/rank|score|primary|secondary|best match/i);
  });

  it("states the measurements are ground truth", () => {
    expect(text).toMatch(/ground truth/i);
    expect(text).toMatch(/L\*/);
    expect(text).toMatch(/hue/i);
  });

  it("includes every measured region", () => {
    expect(text).toMatch(/Skin: L\*/);
    expect(text).toMatch(/Hair: L\*/);
    expect(text).toMatch(/Eyes: L\*/);
  });

  it("explains why hair is absent rather than omitting it silently", () => {
    const dyed = describeFeatures({ ...VALID, hair: null, hairStatus: "dyed" }, rules.axes);
    expect(dyed).toMatch(/not measurable|excluded/i);
    expect(dyed).toMatch(/dyed/);

    const unreadable = describeFeatures({ ...VALID, hair: null }, rules.axes);
    expect(unreadable).toMatch(/could not be measured/i);
  });

  it("passes the derived axes through", () => {
    expect(text).toMatch(/Derived axes: hue \w/);
  });
});
