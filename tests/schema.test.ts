import { describe, expect, it } from "vitest";
import {
  CANONICAL_SEASONS,
  COLOR_ANALYSIS_SCHEMA,
} from "../server/prompts/colorAnalysis";
import { getCanonicalPalette } from "../server/utils/seasonPalettes";

describe("canonical seasons", () => {
  it("is exactly the 12 seasons of the system", () => {
    expect(CANONICAL_SEASONS).toHaveLength(12);
    expect(new Set(CANONICAL_SEASONS).size).toBe(12);
  });

  it("excludes names that are not seasons", () => {
    const names = CANONICAL_SEASONS.map((s) => s.toLowerCase());
    expect(names).not.toContain("soft spring");
    expect(names).not.toContain("light autumn");
  });

  it("covers all four families with three seasons each", () => {
    for (const family of ["Spring", "Summer", "Autumn", "Winter"]) {
      const inFamily = CANONICAL_SEASONS.filter((s) => s.endsWith(family));
      expect(inFamily, family).toHaveLength(3);
    }
  });

  /**
   * The whole point of constraining the enum: a canonical palette lookup can
   * never miss, so the model's own (hallucinated) hexes are always discarded.
   */
  it("every season resolves to a canonical palette", () => {
    for (const season of CANONICAL_SEASONS) {
      const palette = getCanonicalPalette(season);
      expect(palette, season).not.toBeNull();
      expect(palette!.best.length, season).toBeGreaterThan(0);
      expect(palette!.avoid.length, season).toBeGreaterThan(0);
      expect(palette!.metals.best.length, season).toBeGreaterThan(0);
    }
  });

  it("resolves regardless of casing and surrounding space", () => {
    expect(getCanonicalPalette("  DEEP autumn ")).not.toBeNull();
  });
});

describe("COLOR_ANALYSIS_SCHEMA", () => {
  const schema = COLOR_ANALYSIS_SCHEMA.schema as Record<string, any>;

  it("constrains both season fields to the canonical enum", () => {
    expect(schema.properties.primarySeason.enum).toEqual([...CANONICAL_SEASONS]);
    expect(schema.properties.secondarySeason.enum).toEqual([...CANONICAL_SEASONS]);
  });

  it("omits palette colors, which the canonical palette supersedes", () => {
    expect(schema.properties.palette).toBeUndefined();
    expect(schema.properties.neutrals).toBeUndefined();
  });

  /**
   * OpenRouter strict mode requires every object to set additionalProperties
   * false and to list every property in `required`. A schema that violates this
   * is rejected at request time, so assert it structurally rather than
   * discovering it against the live API.
   */
  it("satisfies strict-mode invariants at every level", () => {
    const visit = (node: any, path: string) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "object") {
        expect(node.additionalProperties, `${path}.additionalProperties`).toBe(false);
        const props = Object.keys(node.properties ?? {});
        expect(new Set(node.required ?? []), `${path}.required`).toEqual(new Set(props));
        for (const key of props) visit(node.properties[key], `${path}.${key}`);
      }
      if (node.type === "array") visit(node.items, `${path}[]`);
    };
    visit(schema, "root");
  });

  it("expresses the photo gate as a nullable enum", () => {
    const gate = schema.properties.photoIssue;
    expect(gate.type).toContain("null");
    expect(gate.enum).toContain("no_face");
    expect(gate.enum).toContain("multiple_faces");
    expect(gate.enum).toContain("low_confidence");
  });

  it("requires the evidence-first assessment before a season", () => {
    const required: string[] = schema.required;
    expect(required.indexOf("assessment")).toBeLessThan(
      required.indexOf("primarySeason")
    );
  });

  it("keeps confidence on a 0-1 scale", () => {
    expect(schema.properties.confidence.minimum).toBe(0);
    expect(schema.properties.confidence.maximum).toBe(1);
  });
});
