/**
 * AURA — Model Architecture (OpenRouter)
 *
 * All vision + text tasks use nvidia/nemotron-nano-12b-v2-vl:free via OpenRouter
 * (Google's direct Gemini free tier was cut to 0 quota).
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import { analyzePhotos } from "../services/vision";
import { DEMO_RESULT } from "../services/demoData";
import { isDemo } from "../services/openrouter";
import { getCanonicalPalette } from "../utils/seasonPalettes";
import { prepareImage } from "../utils/prepareImage";
import { sessions } from "../utils/sessionStore";
import { maxFileSizeBytes } from "../utils/config";

const router = Router();

// Normalize AI response (new prompt schema) to frontend-compatible shape
export function normalizeResult(raw: Record<string, unknown>): Record<string, unknown> {
  // Canonical palette: every person classified as e.g. "Deep Autumn" gets the same
  // 12-color palette so the demo (and real analyses) are consistent.
  const canonical = getCanonicalPalette(raw.season as string);
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
  const confidence = typeof raw.confidence === "number" ? raw.confidence : confMap[(raw.confidence as string)?.toLowerCase()] || 75;

  // Build old-format makeup
  const makeup = raw.makeup as Record<string, unknown> | undefined;

  // Build old-format celebrities (reason → why)
  const celebrities = ((raw.celebrities || []) as Array<{ name: string; reason?: string; why?: string }>).map(c => ({
    name: c.name,
    why: c.reason || c.why || "",
  }));

  // Derive depth/chroma from season name
  const season = (raw.season as string) || "";
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
    undertone: raw.undertone || "unknown",
    depth,
    chroma,
    koreanTone,
    contrastLevel: raw.contrastLevel || "medium",
    chromaLevel: raw.chromaLevel || "muted",
    colorDNA: {
      warmth: (raw.colorDNA as Record<string, number>)?.warmth ?? null,
      depth: (raw.colorDNA as Record<string, number>)?.depth ?? null,
      clarity: (raw.colorDNA as Record<string, number>)?.clarity ?? null,
      contrast: (raw.colorDNA as Record<string, number>)?.contrast ?? null,
    },
    reasoning: `${raw.skinDescription || ""} ${raw.hairDescription || ""} ${raw.eyeDescription || ""}`.trim(),
    seasonStory: (raw as Record<string, unknown>).seasonStory || "",
    lightingQuality: "Natural daylight",
    keyFeatures: {
      skinTone: raw.skinDescription || "",
      eyeColor: raw.eyeDescription || "",
      hairColor: raw.hairDescription || "",
      veinColor: "",
      contrast: `${raw.contrastLevel || "medium"} contrast`,
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
        // Legacy string format fallback
        return { recommended: [], avoid: [], tip: typeof f === "string" ? f : "" };
      })(),
      blush: Array.isArray(makeup?.blush) ? (makeup.blush as string[]).join(", ") : (makeup?.blush || ""),
      bronzer: "",
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
      style: "",
    },
    hairColor: {
      bestHighlights: "",
      bestOverall: "",
      avoid: "",
    },
    celebrities,
    koreanAnalysis: {
      tone: koreanTone,
      description: `Your coloring falls into the ${koreanTone} category in the Korean system.`,
      kbeautyTips: "",
    },
    crossValidation: raw.crossValidation || { agrees: true, confidence },
  };
}

// Uploads stay in memory: they flow straight through sharp → base64 → the
// vision API and never touch disk. Real format validation happens in
// prepareImage (magic bytes); the extension filter is just a cheap first gate.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeBytes() },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

// POST /api/analyze — upload photos and analyze
router.post(
  "/analyze",
  upload.array("photos", 1),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "no_photos", message: "No photos uploaded" });
        return;
      }

      let result: Record<string, unknown>;

      if (isDemo()) {
        // Demo mode — simulate a delay then return mock data
        await new Promise((resolve) => setTimeout(resolve, 4000));
        result = { ...DEMO_RESULT };
        console.log("Demo mode — returning sample Deep Autumn analysis");
      } else {
        // Validate + downscale once; the same prepared image feeds face
        // validation and the analysis call.
        let prepared;
        try {
          prepared = await prepareImage(files[0].buffer);
        } catch {
          res.status(400).json({
            error: "invalid_image",
            message: "That file doesn't look like a valid photo. Please upload a JPG, PNG, or WebP image.",
          });
          return;
        }

        console.log("Live mode — analyzing with OpenRouter");
        const raw = await analyzePhotos([
          { base64: prepared.base64, mimeType: prepared.mimeType },
        ]);

        // Face-count and photo-quality gates come back from the model itself
        // (STEP 0 in the analysis prompt) — no separate validation round trip.
        if (raw.error === "no_face" || raw.error === "multiple_faces") {
          const messages: Record<string, string> = {
            no_face: "No face detected. Please upload a clear photo showing your face.",
            multiple_faces: "Multiple faces detected. Please upload a photo of just one person.",
          };
          res.status(400).json({
            error: raw.error,
            message: messages[raw.error as string],
          });
          return;
        }
        if (raw.error) {
          // low_confidence — pass through so the client can show photo tips
          res.json({ sessionId: "", result: raw });
          return;
        }

        // Normalize new prompt schema to frontend-compatible shape
        result = normalizeResult(raw);
      }

      // Store result with a session ID
      const sessionId = uuid();
      sessions.set(sessionId, result);

      res.json({ sessionId, result });
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      const message = err instanceof Error ? err.message : "Analysis failed";

      if (message.includes("429") || message.includes("Too Many Requests") || message.includes("quota")) {
        res.status(429).json({
          error: "rate_limited",
          message: "The AI service is temporarily busy (rate limit reached). Please wait 1 minute and try again.",
        });
      } else if (message.includes("credit balance") || message.includes("billing")) {
        res.status(502).json({
          error: "ai_provider_error",
          message: "The AI service rejected the request. Please try again later.",
        });
      } else if (message.includes("JSON") || message.includes("position")) {
        res.status(502).json({
          error: "ai_incomplete_response",
          message: "The AI returned an incomplete response. Please try again — this usually works on the second attempt.",
        });
      } else {
        res.status(500).json({ error: "analysis_failed", message });
      }
    }
  }
);

// GET /api/results/:sessionId
router.get(
  "/results/:sessionId",
  (req: Request, res: Response): void => {
    const result = sessions.get(req.params.sessionId as string);
    if (!result) {
      res.status(404).json({ error: "not_found", message: "Analysis not found" });
      return;
    }
    res.json(result);
  }
);

// POST /api/demo-session — create a demo session for screenshots/testing
router.post(
  "/demo-session",
  (_req: Request, res: Response): void => {
    const sessionId = uuid();
    sessions.set(sessionId, { ...DEMO_RESULT });
    res.json({ sessionId, result: DEMO_RESULT });
  }
);

export default router;
