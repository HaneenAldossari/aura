export type ValidationResult =
  | { valid: true }
  | { valid: false; error: "no_face" | "multiple_faces" };

export async function validatePhoto(
  base64Image: string,
  mimeType: string
): Promise<ValidationResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { valid: true }; // skip validation in demo mode

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-nano-12b-v2-vl:free",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: "text",
              text: `Count the number of human faces clearly visible in this image.
Respond with ONLY one of these exact strings, nothing else:
- "NO_FACE" — if there are no human faces visible
- "ONE_FACE" — if there is exactly one human face clearly visible
- "MULTIPLE_FACES" — if there are two or more human faces visible`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    // If validation API fails, don't block — let analysis proceed
    console.error("Photo validation API error:", response.status);
    return { valid: true };
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const result = (data.choices?.[0]?.message?.content || "").trim().toUpperCase();

  if (result.includes("ONE_FACE")) return { valid: true };
  if (result.includes("MULTIPLE")) return { valid: false, error: "multiple_faces" };
  return { valid: false, error: "no_face" };
}
