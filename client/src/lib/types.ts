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
  /** Set instead of the fields above when the model can't analyze the photo */
  error?: "low_confidence" | "no_face" | "multiple_faces";
  message?: string;
  photoTips?: string[];
}

export interface AnalyzeResponse {
  sessionId: string;
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
