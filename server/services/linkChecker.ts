import fs from "fs";
import path from "path";

type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

function fileToBase64(filePath: string): { data: string; mimeType: ImageMimeType } {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, ImageMimeType> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return {
    data: buffer.toString("base64"),
    mimeType: mimeMap[ext] || "image/jpeg",
  };
}

export async function checkShoppingImage(
  imagePath: string,
  userProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { verdict: "avoid", matchScore: 0, reason: "OpenRouter API key not configured.", productName: "Unknown", productColor: "Unknown", hex: "#808080", tip: "", similarColors: [] };
  }

  const season = (userProfile.season as string) || "Unknown";
  const undertone = (userProfile.undertone as string) || "Unknown";
  const palette = userProfile.palette as Record<string, unknown>;
  const bestColors = ((palette?.best as Array<{ name: string; hex: string }>) || []).map(c => `${c.name} (${c.hex})`).join(", ");
  console.log("Image check — season:", season, "undertone:", undertone, "bestColors count:", bestColors.split(",").length);

  const { data, mimeType } = fileToBase64(imagePath);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a color analysis expert. I'm a ${season} season with ${undertone} undertone.
My best palette colors are: ${bestColors}

Look at this product photo. Identify exactly what product it is, what color it is, and whether that color matches my seasonal palette.

Respond ONLY with raw JSON (no markdown, no code fences):

{
  "productName": "Short product description (e.g. Leather Tote Bag)",
  "productColor": "Color name in English",
  "hex": "#RRGGBB",
  "matchScore": 85,
  "verdict": "great",
  "reason": "One clear sentence explaining the match or mismatch.",
  "tip": "One actionable styling tip — how to wear it or what to pair it with.",
  "similarColors": [
    { "name": "Color Name", "hex": "#RRGGBB" },
    { "name": "Color Name", "hex": "#RRGGBB" },
    { "name": "Color Name", "hex": "#RRGGBB" }
  ]
}

matchScore rules (0-100):
- 85-100: Perfect match — color is in their best palette or very close → verdict: "great"
- 65-84: Good match — color suits their undertone well → verdict: "good"
- 40-64: Possible — could work with the right styling → verdict: "maybe"
- 0-39: Avoid — color clashes with their season → verdict: "avoid"

similarColors: 3 colors from their actual palette that are close to the product color.
tip: Always include a concrete styling suggestion.
reason: Reference my specific season (${season}) by name.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${data}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const responseData = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = responseData.choices?.[0]?.message?.content || "";
  console.log("Image check raw AI response:", text);

  // Parse JSON from response, handling potential markdown fences
  const clean = text.replace(/```json\s*|```\s*/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain valid JSON");
  }

  const result = JSON.parse(clean.slice(start, end + 1));

  // Normalize verdict
  if (result.verdict) {
    const v = result.verdict.toLowerCase();
    if (v === "yes" || v === "great") result.verdict = "great";
    else if (v === "good") result.verdict = "good";
    else if (v === "maybe") result.verdict = "maybe";
    else result.verdict = "avoid";
  }

  // Ensure matchScore exists
  if (typeof result.matchScore !== "number") {
    const scoreMap: Record<string, number> = { great: 90, good: 75, maybe: 50, avoid: 20 };
    result.matchScore = scoreMap[result.verdict] || 50;
  }

  return result;
}

export async function checkManualItem(
  colorDesc: string,
  category: string,
  brand: string,
  userProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return { verdict: "avoid", matchScore: 0, reason: "OpenRouter API key not configured.", productName: colorDesc, productColor: "Unknown", hex: "#808080", tip: "", similarColors: [] };
  }

  const season = userProfile.season as string || "Unknown";
  const undertone = userProfile.undertone as string || "Unknown";
  const palette = userProfile.palette as Record<string, unknown>;
  const bestColors = ((palette?.best as Array<{name: string; hex: string}>) || []).map(c => `${c.name} (${c.hex})`).join(', ');

  const itemDesc = [
    `Color: ${colorDesc}`,
    category ? `Category: ${category}` : "",
    brand ? `Brand: ${brand}` : "",
  ].filter(Boolean).join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a color analysis expert. A user wants to check if an item color matches their season.

Their color season is: ${season}
Their undertone is: ${undertone}
Their best palette colors are: ${bestColors}

The user has manually described the item:
${itemDesc}

Analyze this color against the user's season palette and respond ONLY with raw JSON (no markdown, no code fences):

{
  "productName": "${brand ? brand + ' ' : ''}${category || 'Item'}",
  "productColor": "Color name in English",
  "hex": "#RRGGBB",
  "matchScore": 85,
  "verdict": "great",
  "reason": "One clear sentence explaining the match or mismatch.",
  "tip": "One actionable styling tip.",
  "similarColors": [
    { "name": "Color Name", "hex": "#RRGGBB" },
    { "name": "Color Name", "hex": "#RRGGBB" },
    { "name": "Color Name", "hex": "#RRGGBB" }
  ]
}

matchScore rules (0-100):
- 85-100: Perfect match → verdict: "great"
- 65-84: Good match → verdict: "good"
- 40-64: Possible → verdict: "maybe"
- 0-39: Avoid → verdict: "avoid"

similarColors: 3 colors from their actual palette that are close to the described color.
tip: Always include a concrete styling suggestion.
reason: Reference their specific season (${season}) by name.`
        },
        {
          role: 'user',
          content: `Check if this color works for my ${season} palette: ${colorDesc}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content || "";
  const clean = text.replace(/```json\s*|```\s*/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error('AI response did not contain valid JSON');
  }

  const result = JSON.parse(clean.slice(start, end + 1));

  if (result.verdict) {
    const v = result.verdict.toLowerCase();
    if (v === "yes" || v === "great") result.verdict = "great";
    else if (v === "good") result.verdict = "good";
    else if (v === "maybe") result.verdict = "maybe";
    else result.verdict = "avoid";
  }

  if (typeof result.matchScore !== "number") {
    const scoreMap: Record<string, number> = { great: 90, good: 75, maybe: 50, avoid: 20 };
    result.matchScore = scoreMap[result.verdict] || 50;
  }

  return result;
}
