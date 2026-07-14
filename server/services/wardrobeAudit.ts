import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

interface AuditItemResult {
  itemIndex: number;
  verdict: "KEEP" | "CAUTION" | "RESTYLE";
  dominantColor: string;
  dominantHex: string;
  undertone: string;
  reason: string;
  tip: string;
}

interface AuditSummary {
  total: number;
  keep: number;
  caution: number;
  restyle: number;
  missingColors: string[];
}

export async function auditWardrobeItem(
  imageBase64: string,
  userProfile: Record<string, unknown>,
  itemIndex: number
): Promise<AuditItemResult> {
  const client = getClient();

  const palette = (userProfile.palette as Record<string, unknown>) || {};
  const bestColors = (palette.best as Array<{ name: string }>) || [];
  const avoidColors = (palette.avoid as Array<{ name: string }>) || [];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: `You are a personal color analyst auditing wardrobe items.

User's season: ${userProfile.season}
Undertone: ${userProfile.undertone}
Best colors: ${bestColors.map((c) => c.name).join(", ")}
Avoid colors: ${avoidColors.map((c) => c.name).join(", ")}

Analyze the clothing item in the photo.
Identify its dominant color and undertone.
Give one of three verdicts:

KEEP — Color is in or close to their best palette.
CAUTION — Color is neutral or borderline. Pair carefully.
RESTYLE — Color clashes with their palette. Wear as bottoms only.

Return ONLY valid JSON:
{
  "verdict": "KEEP" | "CAUTION" | "RESTYLE",
  "dominantColor": "color name",
  "dominantHex": "#hexcode",
  "undertone": "warm" | "cool" | "neutral",
  "reason": "One sentence",
  "tip": "One styling tip"
}`,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Audit this wardrobe item for my color season.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return { itemIndex, ...parsed };
  } catch {
    return {
      itemIndex,
      verdict: "CAUTION",
      dominantColor: "Unknown",
      dominantHex: "#808080",
      undertone: "neutral",
      reason: "Could not analyze this item clearly.",
      tip: "Try re-photographing with better lighting.",
    };
  }
}

export async function auditFullWardrobe(
  images: string[],
  userProfile: Record<string, unknown>
): Promise<{ items: AuditItemResult[]; summary: AuditSummary }> {
  const batchSize = 8;
  const results: AuditItemResult[] = [];

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((img, idx) => auditWardrobeItem(img, userProfile, i + idx))
    );
    results.push(...batchResults);
  }

  const palette = (userProfile.palette as Record<string, unknown>) || {};
  const bestColors = (palette.best as Array<{ name: string }>) || [];
  const detectedColors = results.map((r) => r.dominantColor.toLowerCase());
  const missingColors = bestColors
    .filter((c) => !detectedColors.some((d) => d.includes(c.name.toLowerCase())))
    .map((c) => c.name)
    .slice(0, 3);

  const summary: AuditSummary = {
    total: results.length,
    keep: results.filter((r) => r.verdict === "KEEP").length,
    caution: results.filter((r) => r.verdict === "CAUTION").length,
    restyle: results.filter((r) => r.verdict === "RESTYLE").length,
    missingColors,
  };

  return { items: results, summary };
}
