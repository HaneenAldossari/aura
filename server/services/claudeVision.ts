import fs from "fs";
import path from "path";
import {
  COLOR_ANALYSIS_SYSTEM_PROMPT,
  CROSS_VALIDATION_PROMPT,
  getChatbotSystemPrompt,
} from "../prompts/colorAnalysis";
import { correctAllColors } from "../utils/colorCorrection";

type ImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

// Free vision-capable model served via OpenRouter. Google's direct Gemini
// free tier was cut to 0 quota, so all AI calls now route through OpenRouter.
const DEFAULT_MODEL = "nvidia/nemotron-nano-12b-v2-vl:free";

function fileToBase64(filePath: string): {
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

async function callGemini(
  messages: Array<{ role: string; content: unknown }>,
  options: { model?: string; maxTokens?: number; system?: string } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const model = options.model || DEFAULT_MODEL;

  // OpenRouter is OpenAI-compatible — the content blocks (text + image_url)
  // built by analyzePhotos are already in the right shape, so pass them through.
  const chatMessages: Array<{ role: string; content: unknown }> = [];
  if (options.system) {
    chatMessages.push({ role: "system", content: options.system });
  }
  for (const m of messages) {
    chatMessages.push({
      role: m.role === "model" ? "assistant" : m.role,
      content: m.content,
    });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens || 8192,
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
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
    content.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${data}` },
    });
  });

  content.push({
    type: "text",
    text: "Analyze all provided photos together and return the full color analysis JSON.",
  });

  const text = await callGemini(
    [{ role: "user", content }],
    {
      maxTokens: 8192,
      system: COLOR_ANALYSIS_SYSTEM_PROMPT,
    }
  );

  const parsed = parseJSON(text);

  // Correct color hex mismatches
  correctAllColors(parsed);

  // Check for low confidence error
  if (parsed.error === "low_confidence") {
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

    const text = await callGemini(
      [{ role: "user", content: prompt }],
      { maxTokens: 512 }
    );

    return parseJSON(text);
  } catch (err) {
    console.error("Cross-validation failed:", err);
    return null;
  }
}

export async function chatWithAdvisor(
  analysisResult: Record<string, unknown>,
  messages: { role: "user" | "assistant" | "model"; content: string }[]
): Promise<string> {
  const systemPrompt = getChatbotSystemPrompt(analysisResult);
  const chatMessages = messages.map((msg) => ({
    role: msg.role === "model" ? "assistant" : msg.role,
    content: msg.content,
  }));
  const text = await callGemini(chatMessages, {
    maxTokens: 512,
    system: systemPrompt,
  });
  return text || "I couldn't generate a response. Please try again.";
}
