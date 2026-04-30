// AURA THEME SNAPSHOT — Charcoal + Champagne
// This documents the current theme values for reference.
// To change theme: edit CSS variables in index.css only.

export const THEME_NAME = "Charcoal + Champagne";

export const THEME_COLORS = {
  bgPrimary:      "#0D0D0F",
  bgCard:         "#16161A",
  textPrimary:    "#F2EEE8",
  textSecondary:  "#B8B0A4",
  textMuted:      "#706860",
  accentGold:     "#D4AF7A",
  accentGoldLight:"#EAD09A",
  borderColor:    "#2C2C34",
} as const;

// Used by components that need JS access to theme colors
// (e.g. canvas animations, chart colors, dynamic styles)
export function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
