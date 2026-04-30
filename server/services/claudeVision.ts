import fs from "fs";
import path from "path";
import {
  COLOR_ANALYSIS_SYSTEM_PROMPT,
  CROSS_VALIDATION_PROMPT,
  getChatbotSystemPrompt,
} from "../prompts/colorAnalysis";
import { correctAllColors } from "../utils/colorCorrection";

type ImageMimeType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function getGeminiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || "";
}

type OpenAIContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function toGeminiParts(content: unknown): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: String(content ?? "") }];
  const parts: GeminiPart[] = [];
  for (const block of content as OpenAIContentBlock[]) {
    if (block.type === "text") {
      parts.push({ text: block.text });
    } else if (block.type === "image_url") {
      const url = block.image_url.url;
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
  }
  return parts;
}

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
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const model = options.model || "gemini-flash-latest";
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: toGeminiParts(m.content),
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: options.maxTokens || 8192, thinkingConfig: { thinkingBudget: 0 } },
  };
  if (options.system) {
    body.systemInstruction = { parts: [{ text: options.system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
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
      model: "gemini-flash-latest",
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
      { model: "gemini-flash-latest", maxTokens: 512 }
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
    model: "gemini-flash-latest",
    maxTokens: 512,
    system: systemPrompt,
  });
  return text || "I couldn't generate a response. Please try again.";
}
