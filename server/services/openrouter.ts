/**
 * Shared OpenRouter client — the single place for auth, model selection,
 * request shaping, 429 retry, and JSON extraction. All AI calls in the app
 * go through callOpenRouter().
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free vision-capable model served via OpenRouter. Google's direct Gemini
// free tier was cut to 0 quota, so all AI calls now route through OpenRouter.
const DEFAULT_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

const PLACEHOLDER_VALUES = new Set(["", "your_key_here", "your-key-here"]);

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY || "";
  return PLACEHOLDER_VALUES.has(key.trim()) ? "" : key.trim();
}

// Check at runtime, not import time (dotenv hasn't loaded yet at import time)
export function isDemo(): boolean {
  return !getApiKey();
}

export function getModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

// Chat is text-only, so it uses a much faster free text model than the
// vision model that handles photo analysis.
const DEFAULT_CHAT_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

export function getChatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL || DEFAULT_CHAT_MODEL;
}

export type ChatMessage = { role: string; content: unknown };

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
    model: options.model || getModel(),
    max_tokens: options.maxTokens || 8192,
    messages: chatMessages,
  };
  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.seed !== undefined) body.seed = options.seed;
  if (options.disableReasoning) body.reasoning = { enabled: false };

  // Server-side fallback: OpenRouter tries each model in order on failure.
  const fallback = process.env.OPENROUTER_FALLBACK_MODEL;
  if (fallback && !options.model) {
    body.models = [getModel(), fallback];
  }
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

export async function callOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {}
): Promise<string> {
  if (isDemo()) throw new Error("OPENROUTER_API_KEY not set");

  const body = buildBody(messages, options);
  let response = await requestOnce(body, options.signal);

  // Free-tier 429s are the most common failure mode — retry once, honoring
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
 * Streaming variant — yields content deltas as they arrive from OpenRouter's
 * SSE stream. Used by the chat route when the client opts into streaming.
 */
export async function* streamOpenRouter(
  messages: ChatMessage[],
  options: CallOptions = {}
): AsyncGenerator<string> {
  if (isDemo()) throw new Error("OPENROUTER_API_KEY not set");

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

  const reader = response.body.getReader();
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
