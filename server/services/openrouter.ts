/**
 * Shared OpenRouter client — the single place for auth, model selection,
 * request shaping, 429 retry, and JSON extraction. All AI calls in the app
 * go through callOpenRouter().
 */

import { fallbackModel, modelClassify } from "../utils/config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const PLACEHOLDER_VALUES = new Set(["", "your_key_here", "your-key-here"]);

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY || "";
  return PLACEHOLDER_VALUES.has(key.trim()) ? "" : key.trim();
}

// Check at runtime, not import time (dotenv hasn't loaded yet at import time)
export function isDemo(): boolean {
  return !getApiKey();
}

export type ChatMessage = { role: string; content: unknown };

/** A strict JSON-schema response format, as accepted by OpenRouter. */
export interface JsonSchemaFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

export interface CallOptions {
  model?: string;
  maxTokens?: number;
  system?: string;
  temperature?: number;
  /** Fixed sampling seed — with temperature 0 makes calls repeatable */
  seed?: number;
  /** Disable reasoning-model "thinking" (faster first token for chat) */
  disableReasoning?: boolean;
  /** AbortSignal for cancellation/timeout */
  signal?: AbortSignal;
  /** Constrain the reply to a JSON schema. */
  responseFormat?: JsonSchemaFormat;
}

function buildBody(
  messages: ChatMessage[],
  options: CallOptions
): Record<string, unknown> {
  const chatMessages: ChatMessage[] = [];
  if (options.system) {
    chatMessages.push({ role: "system", content: options.system });
  }
  for (const m of messages) {
    chatMessages.push({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content,
    });
  }

  const body: Record<string, unknown> = {
    model: options.model || modelClassify(),
    max_tokens: options.maxTokens || 8192,
    messages: chatMessages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.seed !== undefined) body.seed = options.seed;
  if (options.disableReasoning) body.reasoning = { enabled: false };
  if (options.responseFormat) body.response_format = options.responseFormat;
  return body;
}

async function requestOnce(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });
}

/** One model attempt: build, send, retry once on 429, throw on any other error. */
async function sendOnce(
  messages: ChatMessage[],
  options: CallOptions
): Promise<string> {
  const body = buildBody(messages, options);
  let response = await requestOnce(body, options.signal);

  // 429s are the most common transient failure — retry once, honoring
  // Retry-After when present (capped at 15s).
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after")) || 5;
    const waitMs = Math.min(retryAfter, 15) * 1000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    response = await requestOnce(body, options.signal);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Run `fn` against the requested model; if it throws and OPENROUTER_FALLBACK_MODEL
 * names a different model, run it once more against that.
 *
 * The fallback engages on *failure* of the primary call — a withdrawn model ID,
 * a provider outage, a persistent 429 — not merely when no model was specified.
 */
async function withFallback<T>(
  options: CallOptions,
  run: (opts: CallOptions) => Promise<T>
): Promise<T> {
  try {
    return await run(options);
  } catch (primaryError) {
    const fallback = fallbackModel();
    const primary = options.model || modelClassify();
    if (!fallback || fallback === primary) throw primaryError;

    console.warn(
      `[openrouter] "${primary}" failed (${(primaryError as Error).message}); ` +
        `retrying with fallback "${fallback}".`
    );
    return run({ ...options, model: fallback });
  }
}

export async function callOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {}
): Promise<string> {
  if (isDemo()) throw new Error("OPENROUTER_API_KEY not set");
  return withFallback(options, (opts) => sendOnce(messages, opts));
}

/**
 * Structured variant: constrains the reply to `schema` and returns parsed JSON.
 *
 * `parseJSON` is still the safety net — a model or provider that ignores
 * response_format returns fenced text rather than failing, and swapping
 * MODEL_CLASSIFY to a model without schema support stays non-fatal.
 */
export async function callOpenRouterJSON<T = Record<string, unknown>>(
  messages: ChatMessage[],
  schema: { name: string; schema: Record<string, unknown> },
  options: CallOptions = {}
): Promise<T> {
  const text = await callOpenRouter(messages, {
    ...options,
    responseFormat: {
      type: "json_schema",
      json_schema: { name: schema.name, strict: true, schema: schema.schema },
    },
  });
  return parseJSON(text) as T;
}

/**
 * Streaming variant — yields content deltas as they arrive from OpenRouter's
 * SSE stream. Used by the chat route when the client opts into streaming.
 */
/** Open a streaming response, retrying once on 429. Throws before any token is yielded. */
async function openStream(
  messages: ChatMessage[],
  options: CallOptions
): Promise<Response> {
  const body = { ...buildBody(messages, options), stream: true };
  let response = await requestOnce(body, options.signal);

  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after")) || 5;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryAfter, 15) * 1000)
    );
    response = await requestOnce(body, options.signal);
  }

  if (!response.ok || !response.body) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }
  return response;
}

export async function* streamOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {}
): AsyncGenerator<string> {
  if (isDemo()) throw new Error("OPENROUTER_API_KEY not set");

  // Falling back is only safe while no token has been emitted yet, so the
  // fallback wraps opening the stream rather than consuming it.
  const response = await withFallback(options, (opts) =>
    openStream(messages, opts)
  );

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by newlines; keep the trailing partial line
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore malformed keep-alive/comment frames
      }
    }
  }
}

/**
 * Parse a JSON object out of a model response, tolerating markdown fences
 * and trailing commas.
 */
export function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // fall through to brace extraction
      }
    }
    // Try extracting raw JSON object
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      const cleaned = braceMatch[0]
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(cleaned);
    }
    throw new Error("Could not parse AI response as JSON");
  }
}

/** Build an OpenAI-style image content block from base64 data. */
export function imageBlock(
  base64: string,
  mimeType: string
): { type: "image_url"; image_url: { url: string } } {
  return {
    type: "image_url",
    image_url: { url: `data:${mimeType};base64,${base64}` },
  };
}
