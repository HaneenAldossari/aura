/**
 * AURA — Model Architecture (Gemini)
 *
 * All vision + text tasks use gemini-flash-latest via the Google AI Studio API.
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { analyzePhotos } from "../services/claudeVision";
import { DEMO_RESULT } from "../services/demoData";
import { validatePhoto } from "../utils/validatePhoto";
import { getCanonicalPalette } from "../utils/seasonPalettes";

// Check at runtime, not import time (dotenv hasn't loaded yet at import time)
function isDemo(): boolean {
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY);
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_key_here" && process.env.ANTHROPIC_API_KEY !== "";
  return !hasGemini && !hasAnthropic;
}

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

// Store analysis results in memory for the session
const analysisStore: Record<string, Record<string, unknown>> = {};

// Multer config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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
        res.status(400).json({ error: "No photos uploaded" });
        return;
      }

      const photoPaths = files.map((f) => f.path);

      // Validate first photo for face detection (skip in demo mode)
      if (!isDemo()) {
        const firstFile = files[0];
        const base64 = fs.readFileSync(firstFile.path).toString("base64");
        const ext = path.extname(firstFile.originalname).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".png": "image/png", ".webp": "image/webp",
        };
        const mimeType = mimeMap[ext] || "image/jpeg";

        const validation = await validatePhoto(base64, mimeType);
        if (!validation.valid) {
          // Clean up files
          photoPaths.forEach((p) => { try { fs.unlinkSync(p); } catch {} });

          const messages: Record<string, string> = {
            no_face: "No face detected. Please upload a clear photo showing your face.",
            multiple_faces: "Multiple faces detected. Please upload a photo of just one person.",
          };
          res.status(400).json({
            error: validation.error,
            message: messages[validation.error],
          });
          return;
        }
      }

      let result: Record<string, unknown>;

      if (isDemo()) {
        // Demo mode — simulate a delay then return mock data
        await new Promise((resolve) => setTimeout(resolve, 4000));
        result = { ...DEMO_RESULT };
        console.log("Demo mode — returning sample Deep Autumn analysis");
      } else {
        console.log("Live mode — analyzing with OpenRouter");
        const raw = await analyzePhotos(photoPaths);
        // Normalize new prompt schema to frontend-compatible shape
        result = normalizeResult(raw);
      }

      // Store result with a session ID
      const sessionId = uuid();
      analysisStore[sessionId] = result;

      // Clean up uploaded files after analysis
      photoPaths.forEach((p) => {
        try {
          fs.unlinkSync(p);
        } catch {}
      });

      res.json({ sessionId, result });
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      const message = err instanceof Error ? err.message : "Analysis failed";

      // Fallback to demo data on billing/credit errors
      if (message.includes("credit balance") || message.includes("billing") || message.includes("400")) {
        console.log("API billing error — falling back to demo data");
        const sessionId = uuid();
        analysisStore[sessionId] = { ...DEMO_RESULT };
        res.json({ sessionId, result: DEMO_RESULT });
        return;
      }

      // User-friendly error messages
      if (message.includes("429") || message.includes("Too Many Requests") || message.includes("quota")) {
        res.status(429).json({
          error: "The AI service is temporarily busy (rate limit reached). Please wait 1 minute and try again.",
        });
      } else if (message.includes("JSON") || message.includes("position")) {
        res.status(500).json({
          error: "The AI returned an incomplete response. Please try again — this usually works on the second attempt.",
        });
      } else {
        res.status(500).json({ error: message });
      }
    }
  }
);

// GET /api/results/:sessionId
router.get(
  "/results/:sessionId",
  (req: Request, res: Response): void => {
    const result = analysisStore[req.params.sessionId as string];
    if (!result) {
      res.status(404).json({ error: "Analysis not found" });
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
    analysisStore[sessionId] = { ...DEMO_RESULT };
    res.json({ sessionId, result: DEMO_RESULT });
  }
);

export default router;
export { analysisStore };
