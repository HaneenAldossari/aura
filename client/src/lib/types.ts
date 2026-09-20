/**
 * Shapes returned by the backend. The source of truth is normalizeResult()
 * in server/routes/analysis.ts — every analysis (live or demo) is normalized
 * to this schema before it reaches the client.
 */

export interface ColorSwatch {
  name: string;
  hex: string;
  /** Styling note ("your power neutral — wear near the face") */
  note?: string;
  /** Why this color works / clashes */
  reason?: string;
}

export interface NamedHex {
  name: string;
  hex: string;
}

export interface Palette {
  best: ColorSwatch[];
  avoid: ColorSwatch[];
  neutrals: string[];
  neutralsWithHex: NamedHex[];
  metals: { best: string[]; avoid: string[] };
}

export interface ColorDNA {
  warmth: number | null;
  depth: number | null;
  clarity: number | null;
  contrast: number | null;
}

export interface Foundation {
  recommended: NamedHex[];
  avoid: NamedHex[];
  tip: string;
}

export interface Makeup {
  foundation: Foundation;
  blush: string;
  bronzer: string;
  lips: string;
  eyes: string;
  nails: { bestColors: string[]; avoidColors: string[] };
}

/** A shade from the canonical per-season list. Hexes are never model-written. */
export type ShadeCategory =
  | "foundation" | "blush" | "bronzer" | "lip"
  | "eye" | "liner" | "highlight" | "nails";

export type ShadeFinish =
  | "matte" | "satin" | "cream" | "shimmer" | "metallic" | "gloss";

export interface MakeupShade {
  name: string;
  hex: string;
  category: ShadeCategory;
  finish: ShadeFinish;
}

/** The canonical shade list for the classified season. */
export interface SeasonMakeup {
  foundation: MakeupShade[];
  undertoneGuide: string;
  blush: MakeupShade[];
  bronzer: MakeupShade[];
  lip: MakeupShade[];
  eye: MakeupShade[];
  liner: MakeupShade[];
  highlight: MakeupShade[];
  nails: MakeupShade[];
  skip: string;
}

/** Canonical gemstone and hair shades, for the visual Style tab. */
export interface StoneShade {
  name: string;
  hex: string;
  accent: string;
}

export interface SeasonStyle {
  gemstones: StoneShade[];
  hair: StoneShade[];
  metalNote: string;
}

export type LookSlot = "eye" | "liner" | "cheek" | "lip" | "bronzer" | "highlight";

/**
 * A named look. The name and vibe line are the model's; every shade was
 * resolved against the canonical list server-side, so `hex` is always ours.
 */
export interface Look {
  name: string;
  vibe: string;
  timeOfDay: "day" | "evening";
  shades: (MakeupShade & { slot: LookSlot })[];
}

export interface KeyFeatures {
  skinTone: string;
  eyeColor: string;
  hairColor: string;
  veinColor: string;
  contrast: string;
}

export interface Celebrity {
  name: string;
  why: string;
}

export interface CrossValidation {
  agrees?: boolean;
  shouldStand?: boolean;
  confidence?: number;
}

/** Hue / value / chroma axes the classifier places you on. */
export interface Axes {
  hue: "warm" | "neutral-warm" | "neutral-cool" | "cool";
  value: "light" | "medium" | "dark";
  chroma: "bright" | "medium" | "soft";
}

/** What the user told us about their hair before analysis. */
export type HairStatus = "natural" | "dyed" | "covered";

/** One region's CIE LCh reading. */
export interface RegionReading {
  L: number;
  C: number;
  h: number;
}

/** What the browser measured, echoed back so the UI can show its working. */
export interface MeasuredSummary {
  skin: RegionReading;
  hair: RegionReading | null;
  eyes: RegionReading | null;
  hairStatus: HairStatus;
  axes: {
    hue: { value: number; label: string };
    value: { value: number; label: string };
    chroma: { value: number; label: string };
  };
  contrast: { value: number; label: string } | null;
  skinBand: "light" | "medium" | "deep";
}

/** Evidence-first read of the photo, recorded before a season is named. */
export interface Assessment {
  undertone: "warm" | "neutral" | "cool";
  depth: "light" | "medium" | "deep";
  chroma: "muted" | "medium" | "clear";
  contrast: "low" | "medium" | "high";
  evidence: string;
}

export interface AnalysisResult {
  season: string;
  seasonTagline?: string;
  confidence: number;
  undertone: string;
  depth: string;
  chroma: string;
  koreanTone?: string;
  contrastLevel: string;
  chromaLevel?: string;
  colorDNA: ColorDNA;
  reasoning?: string;
  seasonStory?: string;
  lightingQuality?: string;
  keyFeatures: KeyFeatures;
  palette: Palette;
  makeup: Makeup;
  wardrobe: { bestColors: string; neutralAnchors: string; avoid: string };
  gemstones: { name: string }[];
  jewelry: { metals: string; stones: string; avoid: string; style: string };
  hairColor: { bestHighlights: string; bestOverall: string; avoid: string };
  celebrities: Celebrity[];
  koreanAnalysis?: { tone: string; description: string; kbeautyTips: string };
  crossValidation?: CrossValidation;
  /** Canonical shade list for this season — the source of every makeup hex. */
  makeupShades?: SeasonMakeup | null;
  /** Canonical gemstones and hair colours for this season. */
  styleShades?: SeasonStyle | null;
  /** Named looks, shades already resolved against makeupShades. */
  looks?: Look[];
  /** Nearest-neighbour season, one of the 12 canonical names. */
  secondarySeason?: string;
  axes?: Axes | null;
  assessment?: Assessment | null;
  rationale?: string;

  // ── Hybrid measurement (Phase 2). All optional: a request without measured
  // features degrades to the LLM-only path and none of these appear.
  measured?: MeasuredSummary;
  /** False when hair could not be read, or the user said it is dyed/covered. */
  hairAvailable?: boolean;
  /** Shown on the results page when hairAvailable is false. */
  hairNote?: string;
  /** The rule-based verdict. The season above is still the model's. */
  rules?: { primary: string; secondary: string; margin: number; ambiguous: boolean };
  agreement?: { level: "primary" | "secondary" | "none"; agrees: boolean };
  /** A suggestion, never a gate, until Phase 4 calibrates the thresholds. */
  needsSecondPhoto?: boolean;
  alternatives?: { season: string; score: number }[];
  /** Set instead of the fields above when the model can't analyze the photo */
  error?: "low_confidence" | "no_face" | "multiple_faces";
  message?: string;
  photoTips?: string[];
}

/**
 * The API is stateless — the response is everything. There is no session id:
 * the client keeps the result (see lib/resultStore.ts) and sends it back when
 * chat or the shop check needs it.
 */
export interface AnalyzeResponse {
  result: AnalysisResult;
}

export type Verdict = "great" | "good" | "maybe" | "avoid";

export interface LinkCheckResultData {
  productName: string;
  productColor: string;
  hex: string;
  matchScore: number;
  verdict: Verdict;
  reason: string;
  tip: string;
  similarColors: NamedHex[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
