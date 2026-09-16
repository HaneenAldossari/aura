/**
 * POST /api/chat
 *
 * Stateless: the client sends the analysis it is holding, rather than a session
 * id the server looks up. That analysis is untrusted input on the way to a paid
 * model call, so it is validated the same way measured features are.
 *
 * Streams when the caller asks for text/event-stream, otherwise returns JSON.
 */

import { getChatbotSystemPrompt } from "../prompts/colorAnalysis";
import { callOpenRouter, isDemo, streamOpenRouter } from "../services/openrouter";
import { modelChat } from "../utils/config";
import { validateAnalysisResult } from "./analysisResult";
import { fail, json, methodNotAllowed, providerErrorResponse } from "./http";

/** Input caps — keep a hostile or buggy client from stuffing the context window. */
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Strip markdown the chat UI does not render, keeping bold. */
function cleanResponse(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/`{1,3}/g, "")
    .trim();
}

export async function handleChat(request: Request): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");

  let body: { analysis?: unknown; messages?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }

  const validated = validateAnalysisResult(body.analysis);
  if (!validated.ok) {
    return fail(400, "invalid_analysis", `Analysis was rejected: ${validated.reason}`);
  }

  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    return fail(400, "bad_request", "messages must be a non-empty array.");
  }
  for (const m of raw) {
    const message = m as ChatMessage;
    if (typeof message?.content !== "string" || message.content.length > MAX_MESSAGE_CHARS) {
      return fail(400, "bad_request", `Each message must be text under ${MAX_MESSAGE_CHARS} characters.`);
    }
  }

  if (isDemo()) {
    return json({
      response: "Demo mode is active. Please set an OPENROUTER_API_KEY for AI-powered responses.",
    });
  }

  const messages = (raw as ChatMessage[]).slice(-MAX_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const options = {
    model: modelChat(),
    maxTokens: 1024,
    system: getChatbotSystemPrompt(validated.result),
  };

  const wantsStream = (request.headers.get("accept") ?? "").includes("text/event-stream");

  try {
    if (!wantsStream) {
      const text = await callOpenRouter(messages, options);
      if (!text) throw new Error("Empty response from chat model");
      return json({ response: cleanResponse(text) });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const delta of streamOpenRouter(messages, options)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Chat stream failed:", err instanceof Error ? err.message : err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "chat_unavailable" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat failed:", err instanceof Error ? err.message : err);
    return providerErrorResponse(err, "chat_unavailable");
  }
}
