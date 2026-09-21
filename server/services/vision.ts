/**
 * Vision analysis service — sends the user's photo to the classification model
 * and returns a structured color analysis. Provider plumbing lives in
 * ./openrouter; model selection lives in ../utils/config.
 *
 * Image bytes are handled in memory only and are never written to disk or
 * logged, here or anywhere in the request path.
 */
import fs from "fs";
import {
  COLOR_ANALYSIS_SYSTEM_PROMPT,
  COLOR_ANALYSIS_SCHEMA,
} from "../prompts/colorAnalysis";
import { correctAllColors } from "../utils/colorCorrection";
import { prepareImage } from "../utils/prepareImage";
import {
  classifyReasoningEnabled,
  maxTokensClassify,
  modelClassify,
} from "../utils/config";
import { callOpenRouterJSON, imageBlock } from "./openrouter";

export interface AnalysisImage {
  base64: string;
  mimeType: string;
}

export interface AnalyzeOptions {
  /**
   * Measured colour values to hand the model as ground truth.
   *
   * Never contains a ranking or a score: a model shown which season the rules
   * prefer would anchor on it, and the agreement check computed afterwards
   * would be measuring its own suggestion.
   */
  measurements?: string;
  /**
   * The only seasons the model may return as primarySeason: the rules' top
   * three, alphabetical and unscored (hybrid.candidateSeasons). Said in the
   * prompt and enforced by the schema's enum, so an out-of-set answer can only
   * come from a fallback model that ignores strict schemas — and the handler
   * overrules that too.
   */
  candidates?: string[];
}

/** The classification schema with primarySeason narrowed to this call's candidates. */
function schemaFor(candidates: string[]): typeof COLOR_ANALYSIS_SCHEMA {
  const schema = structuredClone(COLOR_ANALYSIS_SCHEMA) as typeof COLOR_ANALYSIS_SCHEMA;
  (schema.schema.properties.primarySeason as unknown as { enum: string[] }).enum = [...candidates];
  return schema;
}

export async function analyzePhotos(
  images: AnalysisImage[],
  analyzeOptions: AnalyzeOptions = {}
): Promise<Record<string, unknown>> {
  const labels = ["PHOTO — Face in natural light:"];

  // OpenAI-compatible content blocks: a label, the image, then the instruction.
  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  images.forEach((img, i) => {
    content.push({ type: "text", text: labels[i] || `PHOTO ${i + 1}:` });
    content.push(imageBlock(img.base64, img.mimeType));
  });

  if (analyzeOptions.measurements) {
    content.push({
      type: "text",
      text:
        `${analyzeOptions.measurements}\n\n` +
        "Use these numbers rather than judging colour values by eye. Do not " +
        "restate them, and do not invent hex or Lab values of your own. Your " +
        "job is to decide which season they describe, and to explain why in " +
        "the rationale.",
    });
  }

  const candidates = analyzeOptions.candidates;
  if (candidates?.length) {
    content.push({
      type: "text",
      text:
        `CANDIDATE SEASONS: ${candidates.join(", ")}.\n\n` +
        "The measured values above are only consistent with these seasons. " +
        "primarySeason MUST be one of them — they are listed alphabetically, in " +
        "no order of preference, so weigh all of them against the photo. " +
        "secondarySeason may be any neighbouring season. If none seems right, " +
        "pick the closest of these and say what did not fit in the rationale.",
    });
  }

  content.push({
    type: "text",
    text: "Analyze the provided photo and return the color analysis JSON.",
  });

  const options = {
    model: modelClassify(),
    maxTokens: maxTokensClassify(),
    system: COLOR_ANALYSIS_SYSTEM_PROMPT,
    // Deterministic: the same photo must give the same season every time.
    temperature: 0,
    seed: 12,
    // Reasoning is a large share of classification cost but appears to help on
    // a judgement-heavy task. On by default; the eval harness varies it.
    disableReasoning: !classifyReasoningEnabled(),
  };

  // The strict schema makes malformed JSON rare, but one retry is cheap
  // insurance against a truncated response.
  let parsed: Record<string, unknown> | null = null;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    try {
      parsed = await callOpenRouterJSON(
        [{ role: "user", content }],
        candidates?.length ? schemaFor(candidates) : COLOR_ANALYSIS_SCHEMA,
        options
      );
    } catch (err) {
      lastError = err;
      console.warn(`Analysis call failed (attempt ${attempt + 1})`);
    }
  }
  if (!parsed) throw lastError;

  // Legacy shape only — the strict schema no longer returns palette hexes,
  // since the canonical palette supersedes them. Harmless for demo fixtures.
  correctAllColors(parsed);

  return translatePhotoGate(parsed);
}

/**
 * The schema reports photo problems as `photoIssue`; the rest of the app has
 * always keyed off `error` + `photoTips`. Translating here keeps the
 * /api/analyze status codes and the client's error handling unchanged.
 */
function translatePhotoGate(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const issue = parsed.photoIssue;
  if (typeof issue === "string" && issue) {
    parsed.error = issue;
    if (!parsed.message) {
      parsed.message =
        issue === "no_face"
          ? "We couldn't find a face in that photo."
          : issue === "multiple_faces"
            ? "That photo has more than one face — please upload a solo photo."
            : "The AI needs a clearer photo for an accurate analysis.";
    }
  }
  delete parsed.photoIssue;
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

// NOTE: the old text-only cross-validation pass was removed here. It had never
// actually run — it read `analysis.keyFeatures`, which only exists after
// normalizeResult(), so it always returned null and bailed. Phase 2 replaces it
// with real agreement-checking between the rule-based ranking and the LLM.
