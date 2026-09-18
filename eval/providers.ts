/**
 * Eval providers.
 *
 * Every model goes through OpenRouter, so a "provider adapter" is a model id
 * plus a prompt format — there is no per-vendor SDK code, and adding a
 * comparator is one line. That is the whole benefit of the single provider
 * layer, cashed in.
 *
 * Prices come from EVAL_MODELS in server/utils/config.ts, recorded there so a
 * run can report cost without a second network call.
 */

import { EVAL_MODELS } from "../server/utils/config";
import {
  COLOR_ANALYSIS_SCHEMA,
  COLOR_ANALYSIS_SYSTEM_PROMPT,
} from "../server/prompts/colorAnalysis";
import { callOpenRouterJSON, imageBlock } from "../server/services/openrouter";
import { describeFeatures } from "../server/services/hybrid";
import type { MeasuredFeatures, ScoreResult } from "../measure/score";
import type { Season } from "../measure/seasons.config";

export type ModeName = "llm_only" | "rules_only" | "hybrid";

export interface Provider {
  label: string;
  modelId: string;
  promptUsd: number;
  completionUsd: number;
}

export const PROVIDERS: Provider[] = EVAL_MODELS.map((m) => ({
  label: m.label,
  modelId: m.id,
  promptUsd: m.promptUsd,
  completionUsd: m.completionUsd,
}));

export function resolveProviders(labels: string[]): Provider[] {
  if (labels.length === 0) return [PROVIDERS[0]];
  const chosen: Provider[] = [];
  for (const label of labels) {
    const found = PROVIDERS.find((p) => p.label === label || p.modelId === label);
    if (!found) {
      throw new Error(
        `Unknown provider "${label}". Available: ${PROVIDERS.map((p) => p.label).join(", ")}`
      );
    }
    chosen.push(found);
  }
  return chosen;
}

export interface ClassifyOutcome {
  season: Season | null;
  secondary: Season | null;
  confidence: number | null;
  latencyMs: number;
  costUsd: number;
  error?: string;
}

/**
 * One classification call.
 *
 * In hybrid mode the model receives the measured colour values as ground truth
 * but NEVER the rule-based ranking — a model shown the answer would anchor on
 * it, and the agreement figure would be measuring its own suggestion.
 */
export async function classify(
  provider: Provider,
  imageBase64: string,
  mimeType: string,
  mode: ModeName,
  features: MeasuredFeatures | null,
  rules: ScoreResult | null
): Promise<ClassifyOutcome> {
  const started = Date.now();

  const content: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [
    { type: "text", text: "PHOTO — Face in natural light:" },
    imageBlock(imageBase64, mimeType),
  ];

  if (mode === "hybrid" && features && rules) {
    content.push({
      type: "text",
      text:
        `${describeFeatures(features, rules.axes)}\n\n` +
        "Use these numbers rather than judging colour values by eye. Do not " +
        "restate them, and do not invent hex or Lab values of your own.",
    });
  }

  content.push({
    type: "text",
    text: "Analyze the provided photo and return the color analysis JSON.",
  });

  try {
    const parsed = await callOpenRouterJSON<{
      primarySeason?: string;
      secondarySeason?: string;
      confidence?: number;
      photoIssue?: string | null;
    }>([{ role: "user", content }], COLOR_ANALYSIS_SCHEMA, {
      model: provider.modelId,
      maxTokens: 8192,
      system: COLOR_ANALYSIS_SYSTEM_PROMPT,
      temperature: 0,
      seed: 12,
    });

    return {
      season: (parsed.primarySeason as Season) ?? null,
      secondary: (parsed.secondarySeason as Season) ?? null,
      confidence:
        typeof parsed.confidence === "number" ? Math.round(parsed.confidence * 100) : null,
      latencyMs: Date.now() - started,
      // OpenRouter reports usage per call, but callOpenRouterJSON returns only
      // the parsed body. Estimated from the recorded prices and the observed
      // shape of a real call (~4,700 prompt + ~1,400 completion tokens).
      costUsd: estimateCost(provider),
    };
  } catch (err) {
    return {
      season: null,
      secondary: null,
      confidence: null,
      latencyMs: Date.now() - started,
      costUsd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Cost estimate per classification.
 *
 * Measured on google/gemini-3.8-flash with the real prompt: ~4,700 prompt and
 * ~1,400 completion tokens. Other models will differ, especially in reasoning
 * output, so treat cross-model cost comparisons as indicative rather than
 * billed — the per-run total is what to trust.
 */
const TYPICAL_PROMPT_TOKENS = 4_700;
const TYPICAL_COMPLETION_TOKENS = 1_400;

export function estimateCost(provider: Provider): number {
  return (
    (TYPICAL_PROMPT_TOKENS / 1_000_000) * provider.promptUsd +
    (TYPICAL_COMPLETION_TOKENS / 1_000_000) * provider.completionUsd
  );
}
