/** Metals we hold hexes for, so a row can show the metal as well as name it. */
const METAL_HEX: Record<string, { hex: string; accent: string }> = {
  "yellow gold": { hex: "#C9A567", accent: "#EBD9A8" },
  "rose gold": { hex: "#C68A76", accent: "#E8BCA8" },
  silver: { hex: "#C6CBD2", accent: "#EEF1F5" },
};

export function metalColours(name: string) {
  return METAL_HEX[name.trim().toLowerCase()] ?? { hex: "#8C8378", accent: "#B6AFA4" };
}
