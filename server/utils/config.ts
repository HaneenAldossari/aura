/**
 * Central configuration. Every tunable — model IDs, thresholds, feature flags —
 * lives here rather than inline, so the eval harness can vary them without
 * touching call sites.
 *
 * All models are served through OpenRouter (see services/openrouter.ts).
 * OpenRouter is the single provider layer; there are deliberately no direct
 * Gemini / Anthropic / OpenAI SDK paths in this codebase.
 */

/** Parse MAX_FILE_SIZE ("10mb", "5MB", or raw bytes). Default 10MB. */
export function maxFileSizeBytes(): number {
  const raw = (process.env.MAX_FILE_SIZE || "").trim().toLowerCase();
  if (!raw) return 10 * 1024 * 1024;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(mb|kb|b)?$/);
  if (!match) return 10 * 1024 * 1024;
  const value = parseFloat(match[1]);
  const unit = match[2] || "b";
  const multiplier = unit === "mb" ? 1024 * 1024 : unit === "kb" ? 1024 : 1;
  return Math.round(value * multiplier);
}

// ---------------------------------------------------------------------------
// Model selection
// ---------------------------------------------------------------------------

/**
 * Defaults are paid, vision-capable, and support strict JSON schema output.
 *
 * The free Nemotron models this app previously used were withdrawn from
 * OpenRouter (both now return HTTP 404 — "No endpoints found" and "unavailable
 * for free"), which is why classification moved to a paid model.
 */
export const DEFAULT_MODELS = {
  classify: "google/gemini-3.8-flash",
  chat: "google/gemini-3.8-flash",
  shop: "google/gemini-3.8-flash",
} as const;

export type ModelTask = keyof typeof DEFAULT_MODELS;

/**
 * Legacy env vars, still honored so an existing deployment does not silently
 * fall back to a withdrawn model. Remove once Render/Vercel are updated.
 */
const LEGACY_ENV: Record<ModelTask, string | undefined> = {
  classify: "OPENROUTER_MODEL",
  chat: "OPENROUTER_CHAT_MODEL",
  shop: undefined,
};

const warned = new Set<string>();

function warnOnce(message: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

function resolveModel(task: ModelTask): string {
  const primary = process.env[`MODEL_${task.toUpperCase()}`]?.trim();
  if (primary) return primary;

  const legacyVar = LEGACY_ENV[task];
  const legacy = legacyVar ? process.env[legacyVar]?.trim() : undefined;
  if (legacy) {
    warnOnce(
      `[config] ${legacyVar} is deprecated — use MODEL_${task.toUpperCase()} instead. ` +
        `Using "${legacy}" for ${task}.`
    );
    return legacy;
  }

  return DEFAULT_MODELS[task];
}

/** Vision model that classifies a face into a season. */
export function modelClassify(): string {
  return resolveModel("classify");
}

/** Model backing the stylist chatbot. */
export function modelChat(): string {
  return resolveModel("chat");
}

/** Vision model for "Before You Buy" product checks. */
export function modelShop(): string {
  return resolveModel("shop");
}

/** Optional second model OpenRouter tries if the primary call fails. */
export function fallbackModel(): string | undefined {
  return process.env.OPENROUTER_FALLBACK_MODEL?.trim() || undefined;
}

// ---------------------------------------------------------------------------
// Analysis pipeline
// ---------------------------------------------------------------------------

export type AnalysisMode = "llm_only" | "hybrid";

/**
 * "llm_only" is the pre-measurement pipeline. "hybrid" adds the Python
 * measurement service and rule-based ranking; it becomes the default at the
 * end of Phase 2, and the flag is kept so the eval can compare the two.
 */
export function analysisMode(): AnalysisMode {
  const raw = (process.env.ANALYSIS_MODE || "llm_only").trim().toLowerCase();
  return raw === "hybrid" ? "hybrid" : "llm_only";
}

/**
 * Output-token ceiling for the classification call. OpenRouter rejects a
 * request outright (HTTP 402) when the account cannot afford the *requested*
 * max_tokens, not merely the tokens actually used, so this is worth being able
 * to lower without a code change.
 */
export function maxTokensClassify(): number {
  const raw = Number(process.env.MAX_TOKENS_CLASSIFY);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 8192;
}

/**
 * Reasoning tokens are a large share of classification cost, but they appear to
 * help on a judgement-heavy task. Kept ON by default; the eval harness varies
 * this to measure the accuracy-vs-cost tradeoff.
 */
export function classifyReasoningEnabled(): boolean {
  return (process.env.CLASSIFY_REASONING || "true").trim().toLowerCase() !== "false";
}

// ---------------------------------------------------------------------------
// Eval comparators (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Candidate models for the eval harness. Every entry is vision-capable and
 * supports strict json_schema on OpenRouter, so a "provider adapter" is just a
 * model ID plus the shared prompt — no per-vendor SDK code.
 *
 * Prices are USD per 1M tokens, as listed by OpenRouter; they are recorded here
 * so the harness can report cost per run without a second network call. Verify
 * with `curl https://openrouter.ai/api/v1/models` if a number looks stale.
 */
export const EVAL_MODELS: {
  id: string;
  label: string;
  promptUsd: number;
  completionUsd: number;
}[] = [
  { id: "google/gemini-3.8-flash", label: "gemini-flash", promptUsd: 0.75, completionUsd: 3.75 },
  { id: "google/gemini-3.1-pro-preview", label: "gemini-pro", promptUsd: 2.0, completionUsd: 12.0 },
  { id: "anthropic/claude-sonnet-5", label: "claude-sonnet", promptUsd: 2.0, completionUsd: 10.0 },
  { id: "anthropic/claude-opus-5", label: "claude-opus", promptUsd: 5.0, completionUsd: 25.0 },
  { id: "openai/gpt-5.4-mini", label: "gpt-mini", promptUsd: 0.75, completionUsd: 4.5 },
];
