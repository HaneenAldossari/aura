/**
 * Normalizes the season string from the AI response.
 * "True/Cool Winter" → "True Winter"
 * "Warm/True Autumn" → "Warm Autumn"
 * Single names like "Deep Winter" stay unchanged.
 */
export function formatSeasonName(raw: string): string {
  if (!raw) return "";
  if (!raw.includes("/")) return raw;

  const parts = raw.trim().split(" ");
  const baseSeasons = ["Spring", "Summer", "Autumn", "Winter"];
  const baseSeason = parts.find(p => baseSeasons.includes(p)) ?? "";
  const qualifierPart = parts.filter(p => !baseSeasons.includes(p)).join(" ");
  const qualifiers = qualifierPart.split("/").map(q => q.trim());

  const specificityOrder = ["Deep", "Bright", "Soft", "Light", "Warm", "True", "Cool"];
  const chosen = qualifiers.sort(
    (a, b) => specificityOrder.indexOf(a) - specificityOrder.indexOf(b)
  )[0] ?? qualifiers[0];

  return `${chosen} ${baseSeason}`;
}
