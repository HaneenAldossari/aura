import { callOpenRouter, isDemo, imageBlock } from "../services/openrouter";

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: "no_face" | "multiple_faces" };

export async function validatePhoto(
  base64Image: string,
  mimeType: string
): Promise<ValidationResult> {
  if (isDemo()) return { valid: true }; // skip validation in demo mode

  let result: string;
  try {
    const text = await callOpenRouter(
      [
        {
          role: "user",
          content: [
            imageBlock(base64Image, mimeType),
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
      { maxTokens: 50 }
    );
    result = text.trim().toUpperCase();
  } catch (err) {
    // If validation API fails, don't block — let analysis proceed
    console.error("Photo validation API error:", err);
    return { valid: true };
  }

  if (result.includes("ONE_FACE")) return { valid: true };
  if (result.includes("MULTIPLE")) return { valid: false, error: "multiple_faces" };
  return { valid: false, error: "no_face" };
}
