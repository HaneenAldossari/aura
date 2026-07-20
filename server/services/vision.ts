/**
 * Vision analysis service — sends the user's photo to the vision model and
 * turns the response into a structured color analysis. Provider plumbing
 * lives in ./openrouter.
 */
import fs from "fs";
import {
  COLOR_ANALYSIS_SYSTEM_PROMPT,
  CROSS_VALIDATION_PROMPT,
} from "../prompts/colorAnalysis";
import { correctAllColors } from "../utils/colorCorrection";
import { prepareImage } from "../utils/prepareImage";
import { callOpenRouter, parseJSON, imageBlock } from "./openrouter";

export interface AnalysisImage {
  base64: string;
  mimeType: string;
}

const CROSS_VALIDATION_ENABLED =
  (process.env.ENABLE_CROSS_VALIDATION || "true").toLowerCase() !== "false";

export async function analyzePhotos(
  images: AnalysisImage[]
): Promise<Record<string, unknown>> {
  const labels = [
    "PHOTO — Face in natural light:",
  ];

  // Build OpenAI-compatible content blocks with images
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  images.forEach((img, i) => {
    content.push({ type: "text", text: labels[i] || `PHOTO ${i + 1}:` });
    content.push(imageBlock(img.base64, img.mimeType));
  });

  content.push({
    type: "text",
    text: "Analyze all provided photos together and return the full color analysis JSON.",
  });

  // The free model returns malformed/truncated JSON on a meaningful share of
  // calls — one retry recovers most of them.
  let parsed: Record<string, unknown> | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    const text = await callOpenRouter(
      [{ role: "user", content }],
      {
        maxTokens: 8192,
        system: COLOR_ANALYSIS_SYSTEM_PROMPT,
      }
    );
    try {
      parsed = parseJSON(text);
    } catch (err) {
      lastError = err;
      console.warn(`Analysis JSON parse failed (attempt ${attempt + 1})`);
    }
  }
  if (!parsed) throw lastError;

  // Correct color hex mismatches
  correctAllColors(parsed);

  // Check for photo/confidence errors flagged by the model
  if (parsed.error) {
    return parsed;
  }

  // Cross-validation (second-opinion call; disable with ENABLE_CROSS_VALIDATION=false)
  if (CROSS_VALIDATION_ENABLED) {
    const validated = await crossValidate(parsed);
    if (validated && !validated.shouldStand) {
      parsed.confidence = Math.min(
        (parsed.confidence as number) || 70,
        (validated.confidence as number) || 70
      );
      parsed.crossValidation = validated;
    } else if (validated) {
      parsed.crossValidation = { agrees: true, confidence: validated.confidence };
    }
  }

  return parsed;
}

/** Convenience for scripts: read files from disk, downscale, analyze. */
export async function analyzePhotoFiles(
  photoPaths: string[]
): Promise<Record<string, unknown>> {
  const images = await Promise.all(
    photoPaths.map(async (p) => {
      const prepared = await prepareImage(fs.readFileSync(p));
      return { base64: prepared.base64, mimeType: prepared.mimeType };
    })
  );
  return analyzePhotos(images);
}

async function crossValidate(
  analysis: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  try {
    const features = analysis.keyFeatures as Record<string, string>;
    if (!features) return null;

    const prompt = CROSS_VALIDATION_PROMPT.replace("{skinTone}", features.skinTone || "unknown")
      .replace("{eyeColor}", features.eyeColor || "unknown")
      .replace("{hairColor}", features.hairColor || "unknown")
      .replace("{veinColor}", features.veinColor || "not provided")
      .replace("{contrast}", features.contrast || "unknown")
      .replace("{season}", (analysis.season as string) || "unknown")
      .replace("{confidence}", String((analysis.confidence as number) || "unknown"));

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      { maxTokens: 512 }
    );

    return parseJSON(text);
  } catch (err) {
    console.error("Cross-validation failed:", err);
    return null;
  }
}
