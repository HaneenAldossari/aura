/**
 * Export every canonical shade to a markdown file for human review.
 *
 *   npx tsx scripts/exportShadeReview.ts
 *
 * Writes design/makeup-review.md. The point is that colour judgement is not
 * something this repo can test: a hex can be well-formed, unique and in the
 * right category and still be the wrong shade for the season. So the whole set
 * goes out as tables someone can read and correct in one pass.
 */

import fs from "fs";
import path from "path";
import MAKEUP, { type MakeupShade } from "../server/utils/seasonMakeup";
import STYLE from "../server/utils/seasonStyle";
import { getCanonicalPalette, heroSix, RIBBON_ORDER } from "../server/utils/seasonPalettes";
import { LOOK_NAME_EXTRA_WORDS, LOOK_VOCABULARY, LOOKS_PER_SEASON } from "../server/utils/lookVocabulary";

const OUT = path.join(__dirname, "../design/makeup-review.md");

/** A swatch a markdown viewer will render inline, plus the raw hex. */
function swatch(hex: string): string {
  const bare = hex.replace("#", "").toUpperCase();
  return `![](https://placehold.co/28x18/${bare}/${bare}.png) \`#${bare}\``;
}

function table(rows: string[][], headers: string[]): string {
  const head = `| ${headers.join(" | ")} |`;
  const rule = `| ${headers.map(() => "---").join(" | ")} |`;
  return [head, rule, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function makeupRows(shades: MakeupShade[]): string[][] {
  return shades.map((s) => [s.category, s.name, swatch(s.hex), s.finish]);
}

function seasonSection(season: string): string {
  const keyName = season.toLowerCase();
  const m = MAKEUP[keyName];
  const st = STYLE[keyName];
  const palette = getCanonicalPalette(season);
  const out: string[] = [`## ${season}`, ""];

  if (m) {
    out.push(
      "### Makeup",
      "",
      "**Guidance** — one or two sentences opening each section, above the swatches.",
      "",
      table(
        (["base", "blush", "lip", "eye", "liner", "nails"] as const).map((k) => [
          k,
          m.guidance[k],
        ]),
        ["section", "guidance"]
      ),
      "",
      table(
        [
          ...makeupRows(m.foundation),
          ...makeupRows(m.blush),
          ...makeupRows(m.bronzer),
          ...makeupRows(m.lip),
          ...makeupRows(m.eye),
          ...makeupRows(m.liner),
          ...makeupRows(m.highlight),
          ...makeupRows(m.nails),
        ],
        ["category", "shade name", "hex", "finish"]
      ),
      "",
      `_Skip line:_ ${m.skip}`,
      ""
    );
  }

  if (palette) {
    out.push(
      "### Metals",
      "",
      table(
        [
          ["best", palette.metals.best.join(", "), "—", "—"],
          ["avoid", palette.metals.avoid.join(", "), "—", "—"],
        ],
        ["category", "metals", "hex", "finish"]
      ),
      ""
    );

  }

  if (st) {
    out.push(
      "### Story",
      "",
      st.story,
      "",
      "### Style guidance",
      "",
      table(
        (["jewellery", "hair", "pairings"] as const).map((k) => [k, st.guidance[k]]),
        ["section", "guidance"]
      ),
      "",
      "### Metals",
      "",
      table(
        st.metals.map((m) => [m.name, m.verdict, m.reason]),
        ["metal", "verdict", "reason (five words)"]
      ),
      st.extraMetals ? `\n_Also:_ ${st.extraMetals}\n` : "",
      "",
      "### Pairings",
      "",
      table(
        st.pairings.map((p) => [p.colours.join(" · "), p.when]),
        ["three colours", "when to wear"]
      ),
      "",
      "### Gemstones",
      "",
      table(
        st.gemstones.map((s) => ["gemstone", s.name, swatch(s.hex), swatch(s.accent)]),
        ["category", "stone name", "body hex", "facet hex"]
      ),
      "",
      "### Hair colours",
      "",
      table(
        st.hair.map((s) => ["hair", s.name, swatch(s.hex), swatch(s.accent)]),
        ["category", "shade name", "base hex", "highlight hex"]
      ),
      ""
    );
  }

  return out.join("\n");
}

const doc = [
  "# Shade review",
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/exportShadeReview.ts\`.`,
  "Edit the source files, not this one — it is regenerated.",
  "",
  "| what | source |",
  "| --- | --- |",
  "| makeup shades, finishes, undertone and skip lines | `server/utils/seasonMakeup.ts` |",
  "| gemstones, hair colours, metal notes | `server/utils/seasonStyle.ts` |",
  "| metals | `server/utils/seasonPalettes.ts` (`metals.best` / `metals.avoid`) |",
  "",
  "Every hex here is canonical: the model may name these shades but never",
  "assigns a colour, so correcting a value here corrects it everywhere.",
  "",
  "---",
  "",
  RIBBON_ORDER.map(seasonSection).join("\n---\n\n"),
  "",
  "---",
  "",
  "# Hero six — the Home marquee",
  "",
  "**Draft, for review.** Six colours per season for the Home marquee cards:",
  "a light neutral, four colours, a dark neutral. Every one is a member of that",
  "season's twelve, so this is a choice of *which*, never a new colour. Edit",
  "`HERO_SIX` in `server/utils/seasonPalettes.ts` by name; a name that is not in",
  "the season's palette fails `tests/homeLanding.test.ts`.",
  "",
  "What to check: does the row read as that season at a glance, and would it be",
  "mistaken for its neighbour (Light Spring / Light Summer, Deep Autumn / Deep",
  "Winter, Bright Spring / Bright Winter)?",
  "",
  table(
    RIBBON_ORDER.map((season) => [season, ...heroSix(season).map((c) => `${c.name} ${swatch(c.hex)}`)]),
    ["season", "light neutral", "colour", "colour", "colour", "colour", "dark neutral"]
  ),
  "",
  "---",
  "",
  "# Nail corrections — 2026-09-21",
  "",
  "Nails went from six per season to **four**, each now carrying its brand",
  "(`brand` on the shade; the Beauty tab prints \"OPI · Big Apple Red\").",
  "",
  "**Directed** — removed because they were wrong for the season:",
  "",
  "| season | removed | why |",
  "| --- | --- | --- |",
  "| Deep Winter | Watermelon (OPI) | a bright *warm* pink on the coolest deep season |",
  "| Deep Winter | Perennial Chic (Essie) | muted dusty rose; Deep Winter is clear, not muted |",
  "| Soft Autumn | Princesses Rule (OPI) | a bright *cool* pink on a warm, muted season |",
  "",
  "**Draft, for review** — the rest of the cut to four was my call. The rule I",
  "used: drop what fights the season's temperature first, then its clarity.",
  "",
  "| season | also removed | kept |",
  "| --- | --- | --- |",
  "| Deep Autumn | Perennial Chic, Midnight Cami | Berry Naughty, Malaga Wine, Big Apple Red, Mademoiselle |",
  "| True Autumn | Watermelon, Perennial Chic | Cajun Shrimp, Big Apple Red, Malaga Wine, Mademoiselle |",
  "| Soft Autumn | Berry Naughty | Perennial Chic, Passion, Bare With Me, Mademoiselle |",
  "| Deep Winter | — | Big Apple Red, Berry Naughty, Malaga Wine, Midnight Cami |",
  "| True Winter | Watermelon, Strawberry Margarita | Big Apple Red, Charged Up Cherry, Midnight Cami, Sheer Bliss |",
  "| Bright Winter | Watermelon, Cajun Shrimp | Charged Up Cherry, Strawberry Margarita, Midnight Cami, Sheer Bliss |",
  "| Light Spring | Passion, Perennial Chic | Mademoiselle, Bare With Me, Sheer Bliss, Bachelorette Bash |",
  "| True Spring | Sheer Bliss, Big Apple Red | Cajun Shrimp, Watermelon, Mademoiselle, Bare With Me |",
  "| Bright Spring | Sheer Bliss, Big Apple Red | Cajun Shrimp, Watermelon, Bachelorette Bash, Bare With Me |",
  "| Light Summer | Sugar Daddy, Lovie Dovie | Angel Food, Tiara, Mod About You, Princesses Rule |",
  "| True Summer | Bachelorette Bash, Strawberry Margarita | Tiara, Princesses Rule, Berry Naughty, Midnight Cami |",
  "| Soft Summer | Bare With Me, Mademoiselle | Perennial Chic, Passion, Princesses Rule, Malaga Wine |",
  "",
  "Still questionable and left in for you to judge: **Perennial Chic on Soft",
  "Autumn** (you removed it from Deep Winter for being muted-cool; Soft Autumn is",
  "muted but warm), and **Berry Naughty / Midnight Cami on True Summer** (deep for",
  "a medium-value season). The per-season nail tables above show what ships.",
  "",
  "---",
  "",
  "# Look vocabulary",
  "",
  "**Draft, for review.** A makeup look's name must *start* with one of these",
  `terms and may add up to ${LOOK_NAME_EXTRA_WORDS} words after it ("Soft Glam, Plum"). The model is`,
  `given the list and asked for exactly ${LOOKS_PER_SEASON} looks; \`validateLooks()\` drops any look`,
  "whose name does not comply. Edit `LOOK_VOCABULARY` in",
  "`server/utils/lookVocabulary.ts`, then regenerate the demo analyses",
  "(`npm run precompute:demos -- --force --hair=dyed`, about $0.09).",
  "",
  LOOK_VOCABULARY.map((term) => `- ${term}`).join("\n"),
  "",
].join("\n");

fs.writeFileSync(OUT, doc);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${doc.length.toLocaleString()} chars)`);
