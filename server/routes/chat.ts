import { Router, Request, Response } from "express";
import { sessions } from "../utils/sessionStore";
import { getChatbotSystemPrompt } from "../prompts/colorAnalysis";
import { callOpenRouter, streamOpenRouter, isDemo, getChatModel } from "../services/openrouter";

// Input caps — keep hostile/buggy clients from stuffing the context window
const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 2000;

const router = Router();

function cleanResponse(text: string): string {
  let cleaned = text;
  // Remove markdown italic *text* → text (but preserve bold **text**)
  // First temporarily replace bold markers, strip italic, then restore bold
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/gs, "%%BOLD_START%%$1%%BOLD_END%%");
  cleaned = cleaned.replace(/\*(.+?)\*/gs, "$1");
  cleaned = cleaned.replace(/%%BOLD_START%%/g, "**").replace(/%%BOLD_END%%/g, "**");
  // Remove citation numbers like [1], [3], [12]
  cleaned = cleaned.replace(/\[\d+\]/g, "");
  // Remove leading affirmation words followed by comma, dash, or space
  cleaned = cleaned.replace(/^(?:Yes|No|Sure|Great|Absolutely|Of course|Certainly)[,\-—\s]+/i, "");
  // Clean up double spaces
  cleaned = cleaned.replace(/ {2,}/g, " ");
  return cleaned.trim();
}

router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  const wantsStream = (req.headers.accept || "").includes("text/event-stream");

  try {
    const { sessionId, messages } = req.body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "bad_request", message: "sessionId and messages are required" });
      return;
    }

    // Validate + cap input before it reaches the model
    const valid = messages.every(
      (m: unknown) =>
        m !== null &&
        typeof m === "object" &&
        ["user", "assistant"].includes((m as { role?: string }).role || "") &&
        typeof (m as { content?: unknown }).content === "string" &&
        ((m as { content: string }).content.length <= MAX_MESSAGE_CHARS)
    );
    if (!valid) {
      res.status(400).json({ error: "bad_request", message: "Malformed or oversized messages" });
      return;
    }

    const analysisResult = sessions.get(sessionId);
    if (!analysisResult) {
      res.status(404).json({ error: "not_found", message: "Analysis not found. Please run analysis first." });
      return;
    }

    if (isDemo()) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      res.json({
        response: "Demo mode is active. Please set an OPENROUTER_API_KEY for AI-powered responses.",
      });
      return;
    }

    // Keep only the most recent turns
    const chatMessages = messages
      .slice(-MAX_MESSAGES)
      .map((msg: { role: "user" | "assistant"; content: string }) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      }));

    const options = {
      // Text-only fast model — the vision model is far too slow for chat
      model: getChatModel(),
      disableReasoning: true,
      maxTokens: 1024,
      system: getChatbotSystemPrompt(analysisResult),
    };

    if (wantsStream) {
      // SSE: forward deltas as they arrive. cleanResponse can't run on
      // partial chunks, so formatting cleanup is the client's job here —
      // the prompt already forbids most of what cleanResponse strips.
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      try {
        for await (const delta of streamOpenRouter(chatMessages, options)) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
      } catch (streamErr) {
        console.error("Chat stream error:", streamErr);
        res.write(`data: ${JSON.stringify({ error: "chat_unavailable" })}\n\n`);
      }
      res.end();
      return;
    }

    const text = await callOpenRouter(chatMessages, options);
    if (!text) throw new Error("Empty response from chat model");
    res.json({ response: cleanResponse(text) });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(503).json({
        error: "chat_unavailable",
        message: "Chat is temporarily unavailable. Please try again.",
      });
    }
  }
});

export default router;
