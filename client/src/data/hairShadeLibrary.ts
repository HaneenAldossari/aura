// ---------------------------------------------------------------------------
// Hair Shade Library — gradient-based hair color cards
// ---------------------------------------------------------------------------

export type HairServiceType = "Highlights" | "Balayage" | "Full Color" | "Toning";

export interface HairShade {
  id: string;
  name: string;
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  serviceType: HairServiceType;
  description: string;
  seasons: string[];
  avoidReason?: string;
}

export const HAIR_SHADE_LIBRARY: HairShade[] = [
  // ── Highlights ──────────────────────────────────────────
  {
    id: "ash-blonde-highlights",
    name: "Ash Blonde Highlights",
    gradientTop: "#1C1510",
    gradientMid: "#302418",
    gradientBottom: "#A89070",
    serviceType: "Highlights",
    description: "Cool silver-blonde babylights on dark base",
    seasons: ["Cool Summer", "True Summer", "True Winter", "Soft Summer"],
  },
  {
    id: "ash-beige-highlights",
    name: "Ash Beige Highlights",
    gradientTop: "#1A1410",
    gradientMid: "#2C2018",
    gradientBottom: "#8B7B6A",
    serviceType: "Highlights",
    description: "Cool greige highlights, universally flattering on dark hair",
    seasons: ["Cool Summer", "True Summer", "Soft Summer", "Soft Autumn", "Light Summer", "True Winter"],
  },
  {
    id: "honey-highlights",
    name: "Honey Highlights",
    gradientTop: "#1A0E08",
    gradientMid: "#2C1A0C",
    gradientBottom: "#C49A3A",
    serviceType: "Highlights",
    description: "Warm golden-amber highlights, rich sun-kissed glow",
    seasons: ["True Spring", "Warm Spring", "Light Spring", "Warm Autumn", "True Autumn"],
  },
  {
    id: "chestnut-melt",
    name: "Chestnut Melt",
    gradientTop: "#180E08",
    gradientMid: "#241008",
    gradientBottom: "#7A3A18",
    serviceType: "Highlights",
    description: "Deep warm brown dimension, subtle and natural",
    seasons: ["Deep Autumn", "Warm Autumn", "True Autumn"],
  },

  // ── Balayage ────────────────────────────────────────────
  {
    id: "caramel-highlights",
    name: "Caramel Highlights",
    gradientTop: "#180E08",
    gradientMid: "#2A1408",
    gradientBottom: "#A06A2A",
    serviceType: "Balayage",
    description: "Warm toffee-brown balayage from mid-length to ends",
    seasons: ["True Autumn", "Warm Autumn", "Deep Autumn", "True Spring"],
  },
  {
    id: "warm-espresso",
    name: "Warm Espresso",
    gradientTop: "#100806",
    gradientMid: "#1C0E08",
    gradientBottom: "#4A2814",
    serviceType: "Balayage",
    description: "Dark root melt into warm beige-brown ends",
    seasons: ["Soft Autumn", "Soft Summer", "True Autumn", "Light Autumn"],
  },

  // ── Full Color ──────────────────────────────────────────
  {
    id: "soft-black",
    name: "Soft Black",
    gradientTop: "#0A0A0E",
    gradientMid: "#141420",
    gradientBottom: "#1E1E32",
    serviceType: "Full Color",
    description: "Pure cool black with subtle blue base",
    seasons: ["True Winter", "Deep Winter", "Cool Summer"],
  },
  {
    id: "dark-brown",
    name: "Dark Brown",
    gradientTop: "#160E08",
    gradientMid: "#221408",
    gradientBottom: "#4A2810",
    serviceType: "Full Color",
    description: "Rich natural warm dark brown",
    seasons: ["True Autumn", "Warm Autumn", "Deep Autumn"],
  },
  {
    id: "medium-brown",
    name: "Medium Brown",
    gradientTop: "#180E08",
    gradientMid: "#261408",
    gradientBottom: "#6A3A18",
    serviceType: "Full Color",
    description: "Classic warm brown, natural and versatile",
    seasons: ["Soft Autumn", "True Autumn", "Warm Spring", "Light Autumn"],
  },
  {
    id: "cool-dark-brown",
    name: "Cool Dark Brown",
    gradientTop: "#141214",
    gradientMid: "#201C1C",
    gradientBottom: "#4A3A38",
    serviceType: "Full Color",
    description: "Ashy dark brown with no warmth, cool and sophisticated",
    seasons: ["True Summer", "Soft Summer", "Cool Summer", "Light Summer"],
  },
  {
    id: "warm-chestnut",
    name: "Warm Chestnut",
    gradientTop: "#180A08",
    gradientMid: "#28100A",
    gradientBottom: "#7A3020",
    serviceType: "Full Color",
    description: "Rich red-brown with warm copper undertone",
    seasons: ["True Autumn", "Warm Autumn", "Deep Autumn", "True Spring"],
  },
  {
    id: "deep-burgundy",
    name: "Deep Burgundy",
    gradientTop: "#120810",
    gradientMid: "#1E1020",
    gradientBottom: "#5A2035",
    serviceType: "Full Color",
    description: "Dark cool wine with violet depth",
    seasons: ["True Winter", "Deep Winter", "Cool Summer", "Soft Summer"],
  },
];

/**
 * Get hair shades recommended for a given season.
 */
export function getHairShadesForSeason(season: string): { best: HairShade[]; avoid: HairShade[] } {
  const s = season.toLowerCase();

  const best = HAIR_SHADE_LIBRARY.filter(shade =>
    shade.seasons.some(ss => ss.toLowerCase() === s)
  );

  // Avoid: pick the 2 most clashing shades — opposite undertone
  const isWarm = s.includes("spring") || s.includes("autumn");
  const notRecommended = HAIR_SHADE_LIBRARY.filter(shade =>
    !shade.seasons.some(ss => ss.toLowerCase() === s)
  );

  // For warm seasons, the most clashing are cool-only shades; vice versa
  const clashing = notRecommended.filter(shade => {
    const shadeIsWarm = shade.seasons.some(ss =>
      ss.toLowerCase().includes("spring") || ss.toLowerCase().includes("autumn")
    );
    const shadeIsCool = shade.seasons.some(ss =>
      ss.toLowerCase().includes("summer") || ss.toLowerCase().includes("winter")
    );
    // Most clashing = exclusively the opposite undertone
    if (isWarm) return shadeIsCool && !shadeIsWarm;
    return shadeIsWarm && !shadeIsCool;
  });

  // Take up to 2 clashing shades, add a reason
  const avoid = clashing.slice(0, 2).map(shade => ({
    ...shade,
    avoidReason: isWarm
      ? "Clashes with warm undertone — too ashy"
      : "Too warm, adds brassiness",
  }));

  return { best, avoid };
}

/**
 * Get the season-specific subtitle for the hair section header.
 */
export function getHairSubtitle(season: string): string {
  const s = season.toLowerCase();
  if (s.includes("spring") || s.includes("autumn")) {
    return "Enhance your warm depth — think honey, caramel, and rich browns.";
  }
  if (s.includes("summer") || s.includes("winter")) {
    return "Enhance your cool undertone — think ash, beige, and soft dimension.";
  }
  return "Complement your balance — think natural dimension and soft tones.";
}
