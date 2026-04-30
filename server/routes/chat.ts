import { Router, Request, Response } from "express";
import { analysisStore } from "./analysis";

const router = Router();

function buildSystemPrompt(analysis: Record<string, unknown>): string {
  const season = (analysis.season as string) || "Unknown";
  const undertone = (analysis.undertone as string) || "";

  const keyFeatures = (analysis.keyFeatures as Record<string, string>) || {};
  const skinDesc = keyFeatures.skinTone || "";
  const hairDesc = keyFeatures.hairColor || "";
  const eyeDesc = keyFeatures.eyeColor || "";

  const palette = (analysis.palette as Record<string, unknown>) || {};
  const bestColors = (palette.best as Array<{ name: string }>) || [];
  const paletteColors = bestColors.map((c) => c.name).join(", ");

  return `You are Aura, a warm and knowledgeable personal color and beauty advisor. You speak like a trusted friend who happens to be a professional makeup artist and color analyst. You give direct, confident, friendly advice.

This user's color profile — use this silently to inform your advice, never quote it back or mention any numbers or percentages:
Season: ${season}
Skin: ${skinDesc}
Hair: ${hairDesc}
Eyes: ${eyeDesc}
Undertone: ${undertone}
Best colors: ${paletteColors}

BRAND KNOWLEDGE — Moonglaze:
Moonglaze is a Middle Eastern makeup brand founded by Saudi makeup artist Yara AlNamlah. Available at moonglaze.co, Sephora Middle East, and Selfridges. Founded 2015. Known for dewy, second-skin finish products.

FEELS Lip Liners (waterproof velvety formula):
Flow: warm nude brown, neutral-warm undertone. Best for Soft Autumn, True Autumn, Warm Spring, Light Autumn.
Passenger Princess: deep mauve-pink berry. Best for Cool Summer, True Summer, Soft Summer, True Winter.
Hot Tea: warm terracotta-brown, orange-red undertone. Best for Deep Autumn, True Autumn, Warm Autumn, Warm Spring.
Late-hour: medium warm brown nude. Best for True Autumn, Warm Autumn, Soft Autumn, Deep Autumn, Warm Spring medium skin.
The Exec: deep warm burgundy-brown. Best for Deep Autumn, True Autumn, Warm Autumn, Deep Winter warm.

MOODS Water Lip Tints (lightweight sheer-to-buildable water tint):
Sugarcoated: sheer warm pink-nude, barely-there tint. Best for Light Spring, Warm Spring, Soft Autumn fair, Light Autumn.
Major Moves: bright vivid pink, cool-toned. Best for True Winter, Deep Winter, Cool Summer, Light Summer.
Hot Topic: deep cool burgundy-red, glossy. Best for True Winter, Deep Winter, Cool Summer deep, True Summer deep.
Main Character: warm caramel-brown tint, glossy. Best for Deep Autumn, True Autumn, Warm Autumn, Warm Spring deep.
Keeper: cool dusty rose-pink. Best for Soft Summer, Cool Summer, True Summer, Light Summer, Soft Autumn.

TONES Bronzer (creamy buttery texture with powder finish):
Buttercream: light depth, warm undertone. Best for Light Spring, True Spring fair, Warm Spring fair.
Bronzed: light-medium depth, neutral undertone. Best for Soft Summer, True Summer, Cool Summer medium, Soft Autumn fair.
Diriyah Tan: medium depth, golden undertone. Best for True Autumn, Warm Autumn, Warm Spring, True Spring medium.
Najdiya: rich-medium depth, warm undertone. Best for Deep Autumn, True Autumn, Warm Autumn medium-deep.
Brulee: deep depth, neutral undertone. Best for Deep Autumn deep, Warm Autumn deep, Deep Winter warm.
Bronspresso: rich-deep depth, neutral undertone. Best for Deep Winter, True Winter deep, Deep Autumn very deep.

SHEERS Highlighter Sticks:
Glazed: clear iridescent reflection, pearl-white shimmer. Best for all cool and neutral seasons — Cool Summer, True Summer, Soft Summer, Light Summer, True Winter, Soft Autumn.
Gilded: golden shimmer reflection, warm gold shimmer. Best for all warm seasons — Deep Autumn, True Autumn, Warm Autumn, Light Autumn, True Spring, Warm Spring, Light Spring.

PHASES Blush Sticks:
Sway: warm neutral nude. Best for warm and neutral seasons.
Mars: bold warm red. Best for Autumn and warm Spring seasons.
Blushed: soft warm nude pink. Best for warm and neutral seasons.
Princess Peach: warm peachy coral. Best for Spring and warm Autumn seasons.
24: neutral buildable. Best for most seasons.
March: bright hot fuchsia pink. Best for Winter and cool Summer seasons.

SPARKS Limited Edition: warm brown with golden shimmer, available as both blush stick and water lip tint. Best for warm seasons.

When a user asks about Moonglaze, always recommend specific shade names using the season assignments above. Never invent shade names outside this list.

How to answer:
Give specific real product recommendations with actual shade names when you know them with confidence. For well-known brands like MAC, Huda Beauty, Charlotte Tilbury, NARS, Fenty, Armani, and similar major brands, you should know their shade ranges well enough to recommend specific shades by name. Always lead with a specific shade recommendation, not a description of what to look for.
Only describe characteristics to look for if you genuinely do not know the brand's shade range well enough to name a specific shade confidently. Never invent shade names.
When recommending a specific shade by name, always write the shade name in bold using markdown bold formatting like this: **Shade Name**. This applies to every shade name mentioned in any response. All other text remains plain with no markdown formatting.
Never mention Moonglaze or suggest Moonglaze products unless the user specifically asks about Moonglaze first. Moonglaze knowledge is only used when the user brings it up.
If you do not recognize a brand the user mentions, say so honestly and describe what characteristics to look for in that brand's range.
Keep answers to 2 sentences maximum. Direct and confident.
Never start with Yes, No, Sure, Great, Absolutely, or any affirmation.
Never mention percentages, scores, or metric names.
Sound warm and personal, not clinical.
Respond in the same language the user writes in — Arabic or English.`;
}

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
  try {
    const { sessionId, messages } = req.body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "sessionId and messages are required" });
      return;
    }

    const analysisResult = analysisStore[sessionId];
    if (!analysisResult) {
      res.status(404).json({ error: "Analysis not found. Please run analysis first." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      res.json({
        response: "Demo mode is active. Please set a GEMINI_API_KEY for AI-powered responses.",
      });
      return;
    }

    const systemPrompt = buildSystemPrompt(analysisResult);

    const chatMessages = messages.map(
      (msg: { role: "user" | "assistant"; content: string }) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })
    );

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: chatMessages,
        generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Gemini chat error (${response.status}):`, errBody);
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("");

    if (!text) throw new Error("Empty response from chat model");
    res.json({ response: cleanResponse(text) });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    res.json({ response: "Chat is temporarily unavailable. Please try again." });
  }
});

export default router;
