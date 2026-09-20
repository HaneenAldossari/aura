/**
 * Shared OpenRouter client — the single place for auth, model selection,
 * request shaping, 429 retry, and JSON extraction. All AI calls in the app
 * go through callOpenRouter().
 */

import { fallbackModel, modelClassify, requestTimeoutMs } from "../utils/config";

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

/** Raised when we gave up waiting, as opposed to the provider refusing. */
export class OpenRouterTimeoutError extends Error {
  constructor(ms: number) {
    super(`OpenRouter did not respond within ${ms}ms`);
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * A request with a deadline that the caller can cancel early.
 *
 * The timer is cleared explicitly rather than using AbortSignal.timeout, because
 * for a streaming response the deadline must cover only the wait for headers.
 * A timeout spanning the whole body would kill a long chat mid-sentence.
 */
async function requestOnce(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<{ response: Response; done: () => void }> {
  const timeoutMs = requestTimeoutMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const done = () => clearTimeout(timer);

  // Honour a caller's own cancellation as well as our deadline.
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return { response, done };
  } catch (err) {
    done();
    // A caller-initiated abort is theirs to interpret; ours becomes a timeout.
    if (controller.signal.aborted && !signal?.aborted) {
      throw new OpenRouterTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Some models refuse to have reasoning disabled and reject the request outright.
 *
 * google/gemini-3.8-flash is one, and it is the default for every task, so a
 * caller asking for disableReasoning got a hard 400. Chat did exactly that —
 * a leftover from when the chat model was a free text-only model — and returned
 * 503 to every user until the e2e caught it. Retrying without the field is
 * better than making every call site know which models allow it.
 */
function rejectsDisabledReasoning(message: string): boolean {
  return /reasoning is mandatory|cannot be disabled/i.test(message);
}

/** One model attempt: build, send, retry once on 429, throw on any other error. */
async function sendOnce(
  messages: ChatMessage[],
  options: CallOptions
): Promise<string> {
  const body = buildBody(messages, options);
  let attempt = await requestOnce(body, options.signal);

  // 429s are the most common transient failure — retry once, honoring
  // Retry-After when present (capped at 15s).
  if (attempt.response.status === 429) {
    const retryAfter = Number(attempt.response.headers.get("retry-after")) || 5;
    attempt.done();
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 15) * 1000));
    attempt = await requestOnce(body, options.signal);
  }

  try {
    if (!attempt.response.ok) {
      const errText = await attempt.response.text();
      if (options.disableReasoning && rejectsDisabledReasoning(errText)) {
        return sendOnce(messages, { ...options, disableReasoning: false });
      }
      throw new Error(`OpenRouter API error: ${attempt.response.status} ${errText}`);
    }

    const data = (await attempt.response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content || "";
  } finally {
    attempt.done();
  }
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
  let attempt = await requestOnce(body, options.signal);

  if (attempt.response.status === 429) {
    const retryAfter = Number(attempt.response.headers.get("retry-after")) || 5;
    attempt.done();
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(retryAfter, 15) * 1000)
    );
    attempt = await requestOnce(body, options.signal);
  }

  if (!attempt.response.ok || !attempt.response.body) {
    const errText = await attempt.response.text();
    attempt.done();
    if (options.disableReasoning && rejectsDisabledReasoning(errText)) {
      return openStream(messages, { ...options, disableReasoning: false });
    }
    throw new Error(`OpenRouter API error: ${attempt.response.status} ${errText}`);
  }

  // Headers are in. Stop the clock so a long stream is never cut short.
  attempt.done();
  return attempt.response;
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
