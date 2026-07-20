// Helper: parse hex to RGB
export const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};

// Helper: perceived luminance (0=dark, 1=light)
export const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

// Helper: saturation from HSL
export const saturation = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
};

// Normalize nails — handle both string arrays and object arrays
export const normalizeNailColors = (colors: unknown): string[] => {
  if (!Array.isArray(colors)) return [];
  return colors.map((c: unknown) => {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") {
      const o = c as Record<string, unknown>;
      return (o.shadeName || o.name || "") as string;
    }
    return String(c);
  }).filter(Boolean);
};
