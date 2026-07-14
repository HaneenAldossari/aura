/**
 * Vision analysis service — sends the user's photo to the vision model and
 * turns the response into a structured color analysis. Provider plumbing
 * lives in ./openrouter.
 */
import fs from "fs";
import path from "path";
import {
  COLOR_ANALYSIS_SYSTEM_PROMPT,
  CROSS_VALIDATION_PROMPT,
} from "../prompts/colorAnalysis";
import { correctAllColors } from "../utils/colorCorrection";
import { callOpenRouter, parseJSON, imageBlock } from "./openrouter";

type ImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export function fileToBase64(filePath: string): {
  data: string;
  mimeType: ImageMimeType;
} {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, ImageMimeType> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return {
    data: buffer.toString("base64"),
    mimeType: mimeMap[ext] || "image/jpeg",
  };
}

export async function analyzePhotos(
  photoPaths: string[]
): Promise<Record<string, unknown>> {
  const labels = [
    "PHOTO — Face in natural light:",
  ];

  // Build OpenAI-compatible content blocks with images
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  photoPaths.forEach((filePath, i) => {
    content.push({ type: "text", text: labels[i] || `PHOTO ${i + 1}:` });
    const { data, mimeType } = fileToBase64(filePath);
    content.push(imageBlock(data, mimeType));
  });

  content.push({
    type: "text",
    text: "Analyze all provided photos together and return the full color analysis JSON.",
  });

  const text = await callOpenRouter(
    [{ role: "user", content }],
    {
      maxTokens: 8192,
      system: COLOR_ANALYSIS_SYSTEM_PROMPT,
    }
  );

  const parsed = parseJSON(text);

  // Correct color hex mismatches
  correctAllColors(parsed);

  // Check for photo/confidence errors flagged by the model
  if (parsed.error) {
    return parsed;
  }

  // Cross-validation
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

  return parsed;
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
