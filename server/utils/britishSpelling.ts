/**
 * American → British, for model prose that is rendered verbatim.
 *
 * The prompts ask for British English and the models mostly comply — mostly.
 * "jewelry" and "color" still arrive often enough that a results page written
 * in British English ends up with both spellings on one screen. A prompt is a
 * request; this is the guarantee. It is deliberately a short, closed list of
 * the words this product's copy actually uses, applied to whole words only, so
 * it cannot mangle a product or shade name ("Colorado", "Grayson") or wander
 * into grammar. Anything not on the list is left exactly as written.
 */
const STEMS: [RegExp, string][] = [
  [/\bcolor(s|ed|ing|ful|less|ation|ings)?\b/gi, "colour$1"],
  [/\bjewelry\b/gi, "jewellery"],
  [/\bjeweler(s)?\b/gi, "jeweller$1"],
  [/\bgray(s|er|est|ish)?\b/gi, "grey$1"],
  [/\bfavor(s|ed|ing|ite|ites|able)?\b/gi, "favour$1"],
  // "centered" is "centred", not "centreed": the e belongs to the stem.
  [/\bcentered\b/gi, "centred"],
  [/\bcentering\b/gi, "centring"],
  [/\bcenter(s)?\b/gi, "centre$1"],
  [/\b(accessor|emphas|neutral|harmon|minim|maxim|organ|personal|recogn|modern|final)iz(e|es|ed|ing)\b/gi, "$1is$2"],
];

/** Keep the capitalisation the model used: "Color" → "Colour", "COLOR" → "COLOUR". */
function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

export function toBritish(text: string): string {
  let out = text;
  for (const [pattern, replacement] of STEMS) {
    out = out.replace(pattern, (match, ...groups) => {
      const filled = replacement.replace(/\$(\d)/g, (_, n) => (groups[Number(n) - 1] as string | undefined) ?? "");
      return matchCase(match, filled.toLowerCase());
    });
  }
  return out;
}
