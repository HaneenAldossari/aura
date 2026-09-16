/**
 * AURA — analysis routes.
 *
 * All vision + text tasks run through OpenRouter; per-task model IDs come from
 * server/utils/config.ts (MODEL_CLASSIFY / MODEL_CHAT / MODEL_SHOP).
 *
 * Uploads are held in memory only — multer uses memoryStorage and the buffer
 * flows straight through sharp to base64. Image bytes are never written to
 * disk or logged.
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
import { analysisMode, maxFileSizeBytes } from "../utils/config";
import { validateImage } from "../utils/prepareImage";
import {
  computeAgreement,
  describeFeatures,
  rankSeasons,
  validateFeatures,
} from "../services/hybrid";

const router = Router();

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

      // Measured features from the browser, when the client ran measure/.
      // Untrusted input steering a paid model call, so ranges are checked.
      let measured: ReturnType<typeof validateFeatures> | null = null;
      const rawFeatures = (req.body as Record<string, unknown> | undefined)?.features;
      if (typeof rawFeatures === "string" && rawFeatures.length > 0) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(rawFeatures);
        } catch {
          res.status(400).json({
            error: "invalid_features",
            message: "Measured features were not valid JSON.",
          });
          return;
        }
        measured = validateFeatures(parsed);
        if (!measured.ok) {
          res.status(400).json({
            error: "invalid_features",
            message: `Measured features were rejected: ${measured.reason}`,
          });
          return;
        }
      }

      const hybrid = analysisMode() === "hybrid" && measured?.ok === true;

      let result: Record<string, unknown>;

      if (isDemo()) {
        // Demo mode — simulate a delay then return mock data
        await new Promise((resolve) => setTimeout(resolve, 4000));
        result = { ...DEMO_RESULT };
        console.log("Demo mode — returning sample Deep Autumn analysis");
      } else {
        // When the browser already produced the canonical image — ICC-converted,
        // uprighted and downscaled by measure/encode.ts — re-encoding it here
        // would be a second lossy pass over the exact pixels that were measured,
        // and the model must see those pixels. So validate without re-encoding,
        // and fall back to the full sharp pass for anything else.
        let prepared;
        try {
          if (hybrid) {
            const checked = await validateImage(files[0].buffer);
            prepared = checked.withinCap
              ? {
                  base64: files[0].buffer.toString("base64"),
                  mimeType: `image/${checked.format}` as "image/jpeg",
                  width: checked.width,
                  height: checked.height,
                }
              : await prepareImage(files[0].buffer);
          } else {
            prepared = await prepareImage(files[0].buffer);
          }
        } catch {
          res.status(400).json({
            error: "invalid_image",
            message: "That file doesn't look like a valid photo. Please upload a JPG, PNG, or WebP image.",
          });
          return;
        }

        // Rank the seasons from the measurements. The model never sees this —
        // it is compared against the model's verdict afterwards.
        const rules = hybrid && measured?.ok ? rankSeasons(measured.features) : null;
        const analyzeOptions =
          rules && measured?.ok
            ? { measurements: describeFeatures(measured.features, rules.axes) }
            : {};

        console.log(
          `Live mode — analyzing with OpenRouter (${rules ? "hybrid" : "llm_only"})`
        );
        let raw = await analyzePhotos(
          [{ base64: prepared.base64, mimeType: prepared.mimeType }],
          analyzeOptions
        );

        // The small free model occasionally misfires the face gate on a
        // valid photo — one retry recovers most false negatives cheaply.
        if (raw.error === "no_face") {
          console.log("no_face on first pass — retrying once");
          raw = await analyzePhotos(
            [{ base64: prepared.base64, mimeType: prepared.mimeType }],
            analyzeOptions
          );
        }

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

        // Agreement is computed only now, after the model has committed.
        if (rules && measured?.ok) {
          const agreement = computeAgreement(rules, result.season);
          const confidence = result.confidence as number;
          result = {
            ...result,
            confidence: Math.min(confidence, agreement.confidenceCap * 100),
            measured: {
              skin: measured.features.skin,
              hair: measured.features.hair,
              eyes: measured.features.eyes,
              hairStatus: measured.features.hairStatus,
              axes: rules.axes,
              contrast: rules.contrast,
              skinBand: rules.skinBand,
            },
            hairAvailable: measured.features.hair !== null,
            rules: {
              primary: agreement.rulesPrimary,
              secondary: agreement.rulesSecondary,
              margin: agreement.rulesMargin,
              ambiguous: rules.ambiguous,
            },
            agreement: {
              level: agreement.level,
              agrees: agreement.agrees,
            },
            // A suggestion, never a gate: the thresholds behind it are
            // uncalibrated estimates until Phase 4.
            needsSecondPhoto: agreement.needsSecondPhoto,
            alternatives: agreement.alternatives,
            crossValidation: {
              agrees: agreement.agrees,
              confidence: Math.min(confidence, agreement.confidenceCap * 100),
            },
          };
        }
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
