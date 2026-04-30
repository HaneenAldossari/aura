const GEMSTONE_MAP: Record<string, string> = {
  "diamond":         "diamond",
  "ruby":            "ruby",
  "emerald":         "emerald",
  "sapphire":        "sapphire",
  "amethyst":        "amethyst",
  "turquoise":       "turquoise",
  "pearl":           "pearl",
  "opal":            "opal",
  "fire opal":       "opal-fire",
  "blue opal":       "opal-blue",
  "topaz":           "topaz",
  "aquamarine":      "aquamarine",
  "citrine":         "citrine",
  "garnet":          "garnet",
  "jade":            "jade",
  "lapis lazuli":    "lapis-lazuli",
  "lapis-lazuli":    "lapis-lazuli",
  "amber":           "amber",
  "tigers eye":      "tigers-eye",
  "tiger's eye":     "tigers-eye",
  "tigers-eye":      "tigers-eye",
  "rose quartz":     "rose-quartz",
  "rose-quartz":     "rose-quartz",
  "moonstone":       "moonstone",
  "white moonstone": "moonstone-white",
  "blue moonstone":  "moonstone-blue",
  "carnelian":       "carnelian",
  "peridot":         "peridot",
  "smoky quartz":    "smoky-quartz",
  "smoky-quartz":    "smoky-quartz",
};

export function getGemstoneImage(name: string): string | null {
  const key = name.toLowerCase().trim();
  if (GEMSTONE_MAP[key]) return `/gemstones/${GEMSTONE_MAP[key]}.png`;
  const match = Object.keys(GEMSTONE_MAP).find(k =>
    key.includes(k) || k.includes(key)
  );
  return match ? `/gemstones/${GEMSTONE_MAP[match]}.png` : null;
}
