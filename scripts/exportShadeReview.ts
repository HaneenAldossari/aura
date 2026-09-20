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
import { getCanonicalPalette, RIBBON_ORDER } from "../server/utils/seasonPalettes";

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
].join("\n");

fs.writeFileSync(OUT, doc);
console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${doc.length.toLocaleString()} chars)`);
