/**
 * The single chokepoint between model output and the client contract.
 *
 * Extracted from routes/analysis.ts so the serverless handlers and the local
 * Express server share one implementation. client/src/lib/types.ts mirrors what
 * this returns; adding optional fields is safe, changing an existing field's
 * type is not.
 */
import { getCanonicalPalette } from "./utils/seasonPalettes";

// Normalize AI response (new prompt schema) to frontend-compatible shape
export function normalizeResult(raw: Record<string, unknown>): Record<string, unknown> {
  // The classifier emits `primarySeason` (enum-constrained to the 12 canonical
  // names); demo fixtures and older payloads use `season`. Accept both.
  const season = ((raw.primarySeason || raw.season) as string) || "";
  const assessment = raw.assessment as Record<string, string> | undefined;
  const observations = raw.observations as Record<string, string> | undefined;
  const skinDesc = (observations?.skin || raw.skinDescription || "") as string;
  const hairDesc = (observations?.hair || raw.hairDescription || "") as string;
  const eyeDesc = (observations?.eyes || raw.eyeDescription || "") as string;

  // Canonical palette: every person classified as e.g. "Deep Autumn" gets the same
  // 12-color palette so the demo (and real analyses) are consistent. Because
  // primarySeason is enum-constrained, this lookup always resolves for live
  // analyses; the fallback below only serves legacy fixtures.
  const canonical = getCanonicalPalette(season);
  const palette = raw.palette as Record<string, unknown> | undefined;
  const rawBest = (palette?.bestColors || palette?.best || []) as Array<{ name: string; hex: string; reason?: string; note?: string }>;
  const rawAvoid = (palette?.avoidColors || palette?.avoid || []) as Array<{ name: string; hex: string; reason?: string }>;
  const rawNeutrals = (palette?.neutrals || []) as Array<{ name: string; hex: string } | string>;

  const best = canonical
    ? canonical.best.map(c => ({ ...c }))
    : rawBest.map(c => ({ name: c.name, hex: c.hex, note: c.reason || c.note || "" }));
  const avoid = canonical
    ? canonical.avoid.map(c => ({ ...c }))
    : rawAvoid.map(c => ({ name: c.name, hex: c.hex, reason: c.reason || "" }));
  const neutrals = canonical ? canonical.neutrals.slice() : rawNeutrals;

  // Neutrals: preserve hex if available, otherwise map name to hex
  const neutralNameToHex: Record<string, string> = {
    "warm ivory": "#FFFFF0", "camel": "#C19A6B", "taupe": "#8B7D6B",
    "chocolate brown": "#3D1C02", "deep taupe": "#7C5C52", "navy": "#1C2951",
    "slate grey": "#708090", "charcoal": "#36454F", "cream": "#FFFDD0",
    "light grey": "#D3D3D3", "cool beige": "#C8B9A2", "off white": "#FAF9F6",
    "soft white": "#F8F8FF", "bone": "#E8DCC8", "mushroom": "#B5A59A",
    "dark espresso": "#3D1C02", "warm taupe": "#A08070", "cool grey": "#9E9E9E",
    "espresso": "#3D1C02", "ivory": "#FFFFF0", "ecru": "#C2B280",
    "khaki": "#C3B091", "sand": "#C2B280", "stone": "#928E85",
    "pewter": "#8E8E8E", "graphite": "#383838",
  };
  const neutralsWithHex = neutrals.map(n => {
    if (typeof n === "string") {
      return { name: n, hex: neutralNameToHex[n.toLowerCase()] || "#888888" };
    }
    return { name: n.name, hex: n.hex || neutralNameToHex[n.name.toLowerCase()] || "#888888" };
  });
  const neutralNames = neutralsWithHex.map(n => n.name);

  // Metals: prefer canonical, fall back to undertone-based heuristic
  const wardrobe = raw.wardrobe as Record<string, unknown> | undefined;
  const rawMetals = (wardrobe?.metals || []) as string[];
  const isWarm = (raw.undertone as string || "").toLowerCase().includes("warm");
  const bestMetals = canonical
    ? canonical.metals.best
    : (isWarm ? rawMetals.filter(m => !m.toLowerCase().includes("silver") && !m.toLowerCase().includes("platinum")) : rawMetals);
  const avoidMetals = canonical
    ? canonical.metals.avoid
    : (isWarm ? ["Silver", "Platinum", "White Gold"] : ["Yellow Gold", "Bronze", "Copper"]);

  // Map confidence string to number
  const confMap: Record<string, number> = { high: 90, medium: 75, low: 55 };
  const confidence =
    typeof raw.confidence === "number"
      // The schema expresses confidence as 0-1; the client renders 0-100.
      ? raw.confidence <= 1
        ? Math.round(raw.confidence * 100)
        : raw.confidence
      : confMap[(raw.confidence as string)?.toLowerCase()] || 75;

  // Build old-format makeup
  const makeup = raw.makeup as Record<string, unknown> | undefined;
  const rawHair = raw.hairColor as Record<string, unknown> | undefined;

  // Build old-format celebrities (reason → why)
  const celebrities = ((raw.celebrities || []) as Array<{ name: string; reason?: string; why?: string }>).map(c => ({
    name: c.name,
    why: c.reason || c.why || "",
  }));

  // Derive depth/chroma display strings from the season name
  const sl = season.toLowerCase();
  let depth = "Medium";
  if (sl.includes("deep") || sl.includes("dark")) depth = "Deep / high contrast";
  else if (sl.includes("light")) depth = "Light";

  let chroma = "Medium";
  if (sl.includes("soft") || sl.includes("muted")) chroma = "Muted";
  else if (sl.includes("bright") || sl.includes("vivid")) chroma = "Clear / vivid";

  // Korean analysis
  const koreanTone = (raw.koreanTone as string) || "";

  return {
    season,
    seasonTagline: (raw as Record<string, unknown>).seasonTagline || "",
    confidence,
    undertone: assessment?.undertone || raw.undertone || "unknown",
    depth,
    chroma,
    koreanTone,
    contrastLevel: assessment?.contrast || raw.contrastLevel || "medium",
    chromaLevel: assessment?.chroma || raw.chromaLevel || "muted",
    colorDNA: {
      warmth: (raw.colorDNA as Record<string, number>)?.warmth ?? null,
      depth: (raw.colorDNA as Record<string, number>)?.depth ?? null,
      clarity: (raw.colorDNA as Record<string, number>)?.clarity ?? null,
      contrast: (raw.colorDNA as Record<string, number>)?.contrast ?? null,
    },
    reasoning: `${skinDesc} ${hairDesc} ${eyeDesc}`.trim(),
    seasonStory: (raw as Record<string, unknown>).seasonStory || "",
    lightingQuality: "Natural daylight",
    keyFeatures: {
      skinTone: skinDesc,
      eyeColor: eyeDesc,
      hairColor: hairDesc,
      veinColor: "",
      contrast: `${assessment?.contrast || raw.contrastLevel || "medium"} contrast`,
    },
    palette: {
      best,
      avoid,
      neutrals: neutralNames,
      neutralsWithHex: neutralsWithHex,
      metals: { best: bestMetals, avoid: avoidMetals },
    },
    makeup: {
      foundation: (() => {
        const f = makeup?.foundation;
        if (f && typeof f === "object" && !Array.isArray(f)) {
          const fo = f as Record<string, unknown>;
          return {
            recommended: (fo.recommended as Array<{ name: string; hex: string }>) || [],
            avoid: (fo.avoid as Array<{ name: string; hex: string }>) || [],
            tip: (fo.tip as string) || "",
          };
        }
        // Schema shape (foundationTip) or legacy string
        return {
          recommended: [],
          avoid: [],
          tip: (makeup?.foundationTip as string) || (typeof f === "string" ? f : ""),
        };
      })(),
      blush: Array.isArray(makeup?.blush) ? (makeup.blush as string[]).join(", ") : (makeup?.blush || ""),
      bronzer: (makeup?.bronzer as string) || "",
      lips: Array.isArray(makeup?.lipColors) ? (makeup.lipColors as string[]).join(", ") : (makeup?.lips || ""),
      eyes: Array.isArray(makeup?.eyeshadow) ? (makeup.eyeshadow as string[]).join(", ") : (makeup?.eyes || ""),

      nails: (() => {
        const nailsSrc = (raw.nails || (raw.makeup as Record<string, unknown>)?.nails) as Record<string, unknown> | undefined;
        const normArr = (arr: unknown): string[] => {
          if (!Array.isArray(arr)) return [];
          return arr.map((c: unknown) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object") {
              const o = c as Record<string, unknown>;
              return (o.shadeName || o.name || "") as string;
            }
            return String(c);
          }).filter(Boolean);
        };
        return {
          bestColors: normArr(nailsSrc?.bestColors),
          avoidColors: normArr(nailsSrc?.avoidColors),
        };
      })(),
    },
    wardrobe: {
      bestColors: best.map(c => c.name).join(", "),
      neutralAnchors: neutralNames.join(", "),
      avoid: avoid.map(c => c.name).join(", "),
    },
    gemstones: ((raw.gemstones || []) as Array<{ name: string }>).map(g => ({ name: g.name })),
    jewelry: {
      metals: bestMetals.join(", "),
      stones: "",
      avoid: avoidMetals.join(", "),
      style: (raw.jewelryStyle as string) || "",
    },
    hairColor: {
      bestHighlights: (rawHair?.bestHighlights as string) || "",
      bestOverall: (rawHair?.bestOverall as string) || "",
      avoid: (rawHair?.avoid as string) || "",
    },
    celebrities,
    koreanAnalysis: {
      tone: koreanTone,
      description: `Your coloring falls into the ${koreanTone} category in the Korean system.`,
      kbeautyTips: "",
    },
    crossValidation: raw.crossValidation || { agrees: true, confidence },

    // Additive: measured/derived classification detail. Phase 2 fills `axes`
    // from the measurement service when ANALYSIS_MODE=hybrid.
    secondarySeason: (raw.secondarySeason as string) || "",
    axes: raw.axes || null,
    assessment: assessment || null,
    rationale: (raw.rationale as string) || "",
  };
}
