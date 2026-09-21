import { callOpenRouter, parseJSON, isDemo, imageBlock } from "./openrouter";
import { toBritish } from "../utils/britishSpelling";
import { modelShop } from "../utils/config";

const NOT_CONFIGURED = {
  verdict: "avoid",
  matchScore: 0,
  reason: "OpenRouter API key not configured.",
  productName: "Unknown",
  productColor: "Unknown",
  hex: "#808080",
  tip: "",
  similarColors: [],
};

function profileSummary(userProfile: Record<string, unknown>) {
  const season = (userProfile.season as string) || "Unknown";
  const undertone = (userProfile.undertone as string) || "Unknown";
  const palette = userProfile.palette as Record<string, unknown>;
  const bestColors = ((palette?.best as Array<{ name: string; hex: string }>) || [])
    .map((c) => `${c.name} (${c.hex})`)
    .join(", ");
  return { season, undertone, bestColors };
}

/** Normalize the model's verdict/matchScore into the fixed contract. */
export function normalizeVerdict(result: Record<string, unknown>): Record<string, unknown> {
  // Rendered verbatim beside British-English interface copy. The prompt asks;
  // this makes sure. Names from the palette are ours and already British.
  for (const field of ["productName", "productColor", "reason", "tip"] as const) {
    if (typeof result[field] === "string") result[field] = toBritish(result[field] as string);
  }
  if (result.verdict) {
    const v = String(result.verdict).toLowerCase();
    if (v === "yes" || v === "great") result.verdict = "great";
    else if (v === "good") result.verdict = "good";
    else if (v === "maybe") result.verdict = "maybe";
    else result.verdict = "avoid";
  }
  if (typeof result.matchScore !== "number") {
    const scoreMap: Record<string, number> = { great: 90, good: 75, maybe: 50, avoid: 20 };
    result.matchScore = scoreMap[result.verdict as string] || 50;
  }
  return result;
}

export const RESPONSE_SCHEMA = `{
  "productName": "Short product description (e.g. Leather Tote Bag)",
  "productColor": "Colour name, British spelling (e.g. Charcoal Grey)",
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

Language: productName, productColor, reason and tip are rendered verbatim in an
interface written in British English. Write British spelling throughout —
colour, jewellery, grey, accessorise, emphasise, neutralise, centre — never
color, jewelry, gray, accessorize. The JSON keys above stay exactly as given.`;

export async function checkShoppingImage(
  imageBase64: string,
  mimeType: string,
  userProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (isDemo()) return { ...NOT_CONFIGURED };

  const { season, undertone, bestColors } = profileSummary(userProfile);

  const text = await callOpenRouter(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a color analysis expert. I'm a ${season} season with ${undertone} undertone.
My best palette colors are: ${bestColors}

Look at this product photo. Identify exactly what product it is, what color it is, and whether that color matches my seasonal palette.

Respond ONLY with raw JSON (no markdown, no code fences):

${RESPONSE_SCHEMA}
reason: Reference my specific season (${season}) by name.`,
          },
          imageBlock(imageBase64, mimeType),
        ],
      },
    ],
    { model: modelShop(), maxTokens: 2048 }
  );

  return normalizeVerdict(parseJSON(text));
}

export async function checkManualItem(
  colorDesc: string,
  category: string,
  brand: string,
  userProfile: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (isDemo()) return { ...NOT_CONFIGURED, productName: colorDesc };

  const { season, undertone, bestColors } = profileSummary(userProfile);

  const itemDesc = [
    `Color: ${colorDesc}`,
    category ? `Category: ${category}` : "",
    brand ? `Brand: ${brand}` : "",
  ].filter(Boolean).join("\n");

  const text = await callOpenRouter(
    [
      {
        role: "user",
        content: `Check if this color works for my ${season} palette: ${colorDesc}`,
      },
    ],
    {
      model: modelShop(),
      maxTokens: 2048,
      system: `You are a color analysis expert. A user wants to check if an item color matches their season.

Their color season is: ${season}
Their undertone is: ${undertone}
Their best palette colors are: ${bestColors}

The user has manually described the item:
${itemDesc}

Analyze this color against the user's season palette and respond ONLY with raw JSON (no markdown, no code fences):

${RESPONSE_SCHEMA}
reason: Reference their specific season (${season}) by name.
productName should be: "${brand ? brand + " " : ""}${category || "Item"}"`,
    }
  );

  return normalizeVerdict(parseJSON(text));
}
