/**
 * Shop-check prose is rendered verbatim beside British-English interface copy.
 * The prompt asks for British spelling; toBritish() guarantees it.
 */
import { describe, expect, it } from "vitest";
import { toBritish } from "../server/utils/britishSpelling";
import { normalizeVerdict, RESPONSE_SCHEMA } from "../server/services/linkChecker";

describe("toBritish", () => {
  it.each([
    ["Pair it with gold jewelry.", "Pair it with gold jewellery."],
    ["This color is too gray for you.", "This colour is too grey for you."],
    ["Colors like these are colorful.", "Colours like these are colourful."],
    ["Accessorize with silver to emphasize contrast.", "Accessorise with silver to emphasise contrast."],
    ["A favorite, centered on the waist.", "A favourite, centred on the waist."],
    ["COLOR", "COLOUR"],
    ["Jewelry", "Jewellery"],
  ])("%j → %j", (input, expected) => {
    expect(toBritish(input)).toBe(expected);
  });

  it("leaves names and unrelated words alone", () => {
    for (const text of ["Colorado Blue", "Grayson knit", "A size too large", "prize", "Charcoal Grey", "colour"]) {
      expect(toBritish(text)).toBe(text);
    }
  });

  it("is idempotent", () => {
    const once = toBritish("gray jewelry in a warm color");
    expect(toBritish(once)).toBe(once);
  });
});

describe("the shop check", () => {
  it("asks the model for British spelling", () => {
    expect(RESPONSE_SCHEMA).toMatch(/British/);
    expect(RESPONSE_SCHEMA).toMatch(/jewellery/);
  });

  it("corrects reason, tip and the product fields whatever the model wrote", () => {
    const out = normalizeVerdict({
      productName: "Gray wool coat",
      productColor: "Charcoal Gray",
      hex: "#444444",
      matchScore: 25,
      verdict: "avoid",
      reason: "This muted gray color washes out a Deep Winter.",
      tip: "Add silver jewelry near the face.",
      similarColors: [{ name: "Charcoal", hex: "#1E1E24" }],
    });
    expect(out.productName).toBe("Grey wool coat");
    expect(out.productColor).toBe("Charcoal Grey");
    expect(out.reason).toBe("This muted grey colour washes out a Deep Winter.");
    expect(out.tip).toBe("Add silver jewellery near the face.");
    // Palette names are ours; they pass through untouched.
    expect(out.similarColors).toEqual([{ name: "Charcoal", hex: "#1E1E24" }]);
  });
});
