/**
 * The words a makeup look may be named with.
 *
 * Left to itself the model names looks like perfume — "Effortless Obsidian",
 * "Golden Watermelon Glow", "Spiced Amber Evening" — which sounds lovely and
 * tells nobody what the face will look like. It also drifts: the same season
 * came back as "Golden Hour Glow" on one run and "Effortless Golden Hour" on
 * the next. These are the terms people already use for a finished face, so a
 * name that starts with one is a name someone can picture, and search for.
 *
 * A look's name must START with one of these, and may add up to three words
 * after it to say which ("Soft Glam, Plum" / "Smoky Eye in Bronze"). The
 * prompt is given the list; validateLooks() enforces it, and drops a look
 * whose name does not comply rather than renaming it — a rename would put
 * words in the model's mouth, and the drop is logged so drift is visible.
 *
 * A DRAFT: the list is a judgement call. It is reproduced in
 * design/makeup-review.md for review; changing it means regenerating the demo
 * analyses (scripts/precomputeDemoAnalyses.ts --force), since the precomputed
 * looks were named under the list as it stood.
 */
export const LOOK_VOCABULARY = [
  // day
  "Everyday",
  "No-Makeup Makeup",
  "Clean Girl",
  "Fresh Face",
  "Sun-Kissed",
  "Office Polish",
  "Monochrome",
  // either
  "Soft Glam",
  "Latte Makeup",
  // evening
  "Smoky Eye",
  "Bold Lip",
  "Date Night",
  "Full Glam",
] as const;

/** Exactly this many looks per analysis: the Beauty tab lays them out three across. */
export const LOOKS_PER_SEASON = 3;

/** Words allowed after the vocabulary term. Enough to say which, not enough to get poetic. */
export const LOOK_NAME_EXTRA_WORDS = 3;

const normalise = (text: string) =>
  text.toLowerCase().replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

/** The vocabulary term a name starts with, or null. Case- and dash-insensitive; whole words only. */
export function vocabularyTerm(name: string): string | null {
  const n = normalise(name);
  // Longest first, so "No-Makeup Makeup" is not read as something shorter.
  const terms = [...LOOK_VOCABULARY].sort((a, b) => b.length - a.length);
  for (const term of terms) {
    const t = normalise(term);
    if (n === t) return term;
    if (n.startsWith(t) && /[\s,:–—-]/.test(n.charAt(t.length))) return term;
  }
  return null;
}

/** Why a name is not acceptable, or null if it is. */
export function lookNameProblem(name: string): string | null {
  const term = vocabularyTerm(name);
  if (!term) return "does not start with a vocabulary term";
  const rest = normalise(name).slice(normalise(term).length).replace(/^[\s,:–—-]+/, "");
  const extra = rest ? rest.split(" ").length : 0;
  if (extra > LOOK_NAME_EXTRA_WORDS) return `adds ${extra} words after "${term}" (max ${LOOK_NAME_EXTRA_WORDS})`;
  return null;
}

/** The list, as the prompt prints it. */
export function vocabularyForPrompt(): string {
  return LOOK_VOCABULARY.map((term) => `"${term}"`).join(", ");
}
