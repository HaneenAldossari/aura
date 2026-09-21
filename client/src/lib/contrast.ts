/**
 * Label colour for text sitting on an arbitrary palette swatch.
 *
 * The palette is the user's, so the hexes are unknown at build time and range
 * from #F0D8A8 to #24160F. Picking one label colour for all twelve would fail
 * the 4.5:1 floor at one end or the other, so each swatch chooses.
 *
 * This is WCAG relative luminance, deliberately not CIE L*: they disagree in
 * the mid-range, and the contrast requirement is defined in terms of this one.
 */

const INK = "#F3EDE4";
const GROUND = "#0C0A09";

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 0;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The better of ink and ground against `background`.
 *
 * Returns whichever wins even when neither clears 4.5:1 — a swatch in the
 * middle of the range has no compliant label colour, and rendering the best
 * available beats rendering nothing. `labelPassesAA` reports the truth so a
 * test can hold the palettes themselves to account.
 */
export function readableOn(background: string): string {
  return contrastRatio(INK, background) >= contrastRatio(GROUND, background) ? INK : GROUND;
}

export function labelPassesAA(background: string): boolean {
  return contrastRatio(readableOn(background), background) >= 4.5;
}
