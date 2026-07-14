/**
 * Replaces third-person pronouns with second-person equivalents.
 * Safety net for AI responses that use "she/he/they" instead of "you/your".
 */
export function sanitizeToSecondPerson(text: string): string {
  if (!text) return "";

  return text
    .replace(/\bher\b/gi, "your")
    .replace(/\bhis\b/gi, "your")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthey have\b/gi, "you have")
    .replace(/\bshe has\b/gi, "you have")
    .replace(/\bhe has\b/gi, "you have")
    .replace(/\bthey are\b/gi, "you are")
    .replace(/\bshe is\b/gi, "you are")
    .replace(/\bhe is\b/gi, "you are")
    .replace(/\bshe appears\b/gi, "you appear")
    .replace(/\bhe appears\b/gi, "you appear")
    .replace(/\bthey appear\b/gi, "you appear")
    .replace(/\bshe\b/gi, "you")
    .replace(/\bhe\b/gi, "you")
    .replace(/\bthey\b/gi, "you")
    .replace(/^your\b/, "Your")
    .replace(/^you\b/, "You");
}
