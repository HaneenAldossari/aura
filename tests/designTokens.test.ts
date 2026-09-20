import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The design system marks `ink muted` as "floor 4.5:1". This checks that claim
 * against the real token values rather than trusting the label, and covers
 * every text role the editorial direction actually uses.
 *
 * WCAG relative luminance, not CIE L* — they are different curves, and the
 * accessibility threshold is defined on the former.
 */
const CSS = fs.readFileSync(path.join(__dirname, "../client/src/index.css"), "utf8");

function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`token --${name} not found in index.css`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("colour roles carry the editorial values", () => {
  it.each([
    ["ground", "#0C0A09"],
    ["surface", "#131110"],
    ["rule", "#26211C"],
    ["accent", "#C9A567"],
    ["ink", "#F3EDE4"],
    ["ink-secondary", "#C8C0B6"],
    ["ink-trust", "#B9B0A5"],
    ["ink-muted", "#8C8378"],
  ])("--%s is %s", (name, hex) => {
    expect(token(name).toUpperCase()).toBe(hex);
  });
});

describe("contrast floors", () => {
  const ground = "#0C0A09";
  const surface = "#131110";

  /** Body text and small labels must clear 4.5:1 — rule 8 of the sprint. */
  it.each([
    ["ink", 4.5],
    ["ink-secondary", 4.5],
    ["ink-trust", 4.5],
    ["ink-muted", 4.5],
  ])("--%s on the page ground clears %s:1", (name, floor) => {
    expect(contrast(token(name), ground)).toBeGreaterThanOrEqual(floor);
  });

  it("every text role clears 4.5:1 on inset panels too", () => {
    for (const name of ["ink", "ink-secondary", "ink-trust", "ink-muted"]) {
      expect(contrast(token(name), surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gold clears 4.5:1 as text, since it marks confidence and active state", () => {
    expect(contrast(token("accent"), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("text on a gold fill clears 4.5:1", () => {
    expect(contrast(token("on-accent"), token("accent"))).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The design's own note: at 45% the 13px season labels measure about 3:1, so
   * the ribbon dims palette bars only and shifts the name's colour instead.
   * This pins the reasoning — if it ever passed, the workaround is unnecessary.
   */
  it("confirms why the ribbon does not dim its season names", () => {
    const dimmed = "#3F3B36"; // ink-muted at 45% over ground
    expect(contrast(dimmed, ground)).toBeLessThan(4.5);
    expect(contrast(token("accent"), ground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("type scale", () => {
  it("never goes below 11px, at either width", () => {
    const sizes = [...CSS.matchAll(/--type-[a-z-]+:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(6);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
  });

  it("carries the three editorial families", () => {
    expect(CSS).toMatch(/--font-display:\s*"Bodoni Moda"/);
    expect(CSS).toMatch(/--font-body:\s*Archivo/);
    expect(CSS).toMatch(/--font-mono:\s*"IBM Plex Mono"/);
  });

  it("includes an Arabic face in the body stack, ready for the RTL switch", () => {
    expect(CSS).toMatch(/IBM Plex Sans Arabic/);
  });
});

describe("safe-area insets exist for installed PWA mode", () => {
  it.each(["top", "bottom", "left", "right"])("--safe-%s reads env()", (side) => {
    expect(CSS).toMatch(new RegExp(`--safe-${side}:\\s*env\\(safe-area-inset-${side}`));
  });
});
