/**
 * Known color name → hex corrections for common mismatches.
 * Fallback for when AI returns wrong hex for a named color.
 */
const KNOWN_COLORS: Record<string, string> = {
  "brick red": "#B22222",
  "cool taupe": "#8B7D7B",
  "ash brown": "#987654",
  "warm nude": "#C8956C",
  "peach nude": "#FFCBA4",
  "terracotta": "#C4622D",
  "coral": "#FF7F50",
  "dusty rose": "#DCAE96",
  "mauve": "#E0B0B0",
  "burgundy": "#800020",
  "rust": "#B7410E",
  "camel": "#C19A6B",
  "olive": "#6B7A3A",
  "mustard": "#9B8B00",
  "forest green": "#228B22",
  "navy": "#000080",
  "charcoal": "#36454F",
  "espresso": "#3D1C02",
  "warm ivory": "#F5ECD7",
  "cream": "#FFFDD0",
  "slate blue": "#7A8FA6",
  "dusty blue": "#6B8FAF",
  "lavender": "#C4B5D0",
  "sage": "#8A9E8A",
  "warm sage": "#8B9E6B",
  "rose gold": "#B76E79",
  "copper": "#B87333",
  "ochre": "#CC7722",
  "warm plum": "#6B3A5D",
  "cool plum": "#7B6688",
  "deep rust": "#8B3A1A",
  "dark mustard": "#9B7B00",
  "warm taupe": "#A08070",
  "muted coral": "#C47A6B",
  "dusty peach": "#D4A088",
  "powder blue": "#B0C4DE",
  "soft rose": "#E8B4BC",
  "periwinkle": "#CCCCEE",
  "blush": "#E8C4C4",
  "pale mint": "#B5CEC4",
  "icy pink": "#F0D4D4",
  "emerald": "#50C878",
  "royal blue": "#4169E1",
  "hot pink": "#FF69B4",
  "pure black": "#000000",
  "pure white": "#FFFFFF",
};

/**
 * Checks if a hex roughly matches the expected hue for a color name.
 * If not, returns the known correction.
 */
export function correctColorHex(name: string, hex: string): string {
  const known = KNOWN_COLORS[name.toLowerCase()];
  if (known) return known;
  return hex;
}

/**
 * Corrects all named colors in a parsed AI result.
 * Modifies the object in place and returns it.
 */
export function correctAllColors(result: Record<string, unknown>): Record<string, unknown> {
  // Palette bestColors
  const palette = result.palette as Record<string, unknown> | undefined;
  if (palette) {
    const bestColors = palette.bestColors as Array<{ name: string; hex: string }> | undefined;
    if (bestColors) {
      bestColors.forEach(c => { c.hex = correctColorHex(c.name, c.hex); });
    }
    const avoidColors = palette.avoidColors as Array<{ name: string; hex: string }> | undefined;
    if (avoidColors) {
      avoidColors.forEach(c => { c.hex = correctColorHex(c.name, c.hex); });
    }
    const neutrals = palette.neutrals as Array<{ name: string; hex: string }> | undefined;
    if (neutrals && Array.isArray(neutrals)) {
      neutrals.forEach(c => {
        if (typeof c === 'object' && c.name && c.hex) {
          c.hex = correctColorHex(c.name, c.hex);
        }
      });
    }
  }

  // Nails — now string arrays, no hex to correct

  return result;
}
