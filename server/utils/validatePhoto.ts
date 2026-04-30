export type ValidationResult =
  | { valid: true }
  | { valid: false; error: "no_face" | "multiple_faces" };

export async function validatePhoto(
  base64Image: string,
  mimeType: string
): Promise<ValidationResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) return { valid: true }; // skip validation in demo mode

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            {
              text: `Count the number of human faces clearly visible in this image.
Respond with ONLY one of these exact strings, nothing else:
- "NO_FACE" — if there are no human faces visible
- "ONE_FACE" — if there is exactly one human face clearly visible
- "MULTIPLE_FACES" — if there are two or more human faces visible`,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 50 },
    }),
  });

  if (!response.ok) {
    // If validation API fails, don't block — let analysis proceed
    console.error("Photo validation API error:", response.status);
    return { valid: true };
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const result = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim().toUpperCase();

  if (result.includes("ONE_FACE")) return { valid: true };
  if (result.includes("MULTIPLE")) return { valid: false, error: "multiple_faces" };
  return { valid: false, error: "no_face" };
}
