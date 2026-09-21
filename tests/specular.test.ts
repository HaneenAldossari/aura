/**
 * Specular handling.
 *
 * Specular reflection is additive and one-sided: a highlight can only raise
 * L*, never lower it. A plain median over a lit patch is therefore a biased
 * estimator of skin colour, and the bias grows with gloss — which is why two
 * deep-skinned demo faces came back as "Light Summer" and "Light Spring".
 */
import { describe, expect, it } from "vitest";
import { diffusePixels } from "../measure/features";
import { SPECULAR } from "../measure/seasons.config";
import { median } from "../measure/color";

/** A patch of diffuse skin with a specular highlight over part of it. */
function patch(diffuseL: number, specularL: number, specularFraction: number) {
  const n = 1000;
  return Array.from({ length: n }, (_, i) => {
    const specular = i < n * specularFraction;
    return {
      L: specular ? specularL : diffuseL,
      a: specular ? 4 : 18,
      b: specular ? 6 : 22,
    };
  });
}

describe("diffusePixels", () => {
  it("returns the diffuse value when a highlight covers a third of the patch", () => {
    const pixels = patch(42, 78, 0.34);
    const kept = diffusePixels(pixels);
    expect(median(kept.map((p) => p.L))).toBe(42);
  });

  it("still finds the diffuse value when the highlight covers half", () => {
    // The old estimator returned the midpoint here, which is a colour that
    // exists nowhere on the face.
    const kept = diffusePixels(patch(42, 78, 0.5));
    expect(median(kept.map((p) => p.L))).toBe(42);
  });

  it("keeps chroma with the pixels it came from", () => {
    // The bug this guards: taking median(L), median(a), median(b) over the
    // whole patch independently describes a colour no pixel actually had.
    const kept = diffusePixels(patch(42, 78, 0.4));
    expect(median(kept.map((p) => p.a))).toBe(18);
    expect(median(kept.map((p) => p.b))).toBe(22);
  });

  it("drops the shadow tail as well as the highlight", () => {
    const pixels = [
      ...Array.from({ length: 100 }, () => ({ L: 5, a: 2, b: 2 })),   // occlusion
      ...Array.from({ length: 800 }, () => ({ L: 50, a: 18, b: 22 })), // skin
      ...Array.from({ length: 100 }, () => ({ L: 92, a: 3, b: 4 })),   // highlight
    ];
    expect(median(diffusePixels(pixels).map((p) => p.L))).toBe(50);
  });

  it("leaves a small sample alone rather than slicing it to nothing", () => {
    const tiny = [{ L: 10, a: 1, b: 1 }, { L: 20, a: 1, b: 1 }];
    expect(diffusePixels(tiny)).toHaveLength(2);
  });

  it("trims harder at the top than the bottom", () => {
    // Only one tail is additive. Specular can only add light, so the band has
    // to cut more from the top than from the bottom — a symmetric trim would
    // treat a highlight and a shadow as equally likely, which they are not.
    const { lo, hi } = SPECULAR.diffuseBand;
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeLessThan(1);
    expect(lo).toBeLessThan(hi);
    const trimmedBelow = lo;
    const trimmedAbove = 1 - hi;
    expect(trimmedAbove).toBeGreaterThan(trimmedBelow);
  });
});
