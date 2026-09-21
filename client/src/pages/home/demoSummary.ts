/**
 * What Home's four cards say, from the analysis the Results page shows.
 *
 * One source: `server/demo-analyses/sample-1.json` — the file /api/demo-load
 * serves when someone taps the first sample face. Home used to show captures
 * of the Results screen, which are a second copy the moment the analysis is
 * regenerated; a number on the landing page that disagrees with the number on
 * the page it links to is worse than no number. Here the season, confidence
 * and depth are read from that file at build time, so they cannot disagree.
 *
 * The shades are looked up from the canonical modules by that season — exactly
 * what the demo-load handler does on the way out (server/handlers/tools.ts),
 * and for the same reason: they are a pure function of the season, and the
 * copies embedded in the file go stale when a hex is corrected.
 *
 * Named imports, so the bundler keeps four fields of a 15 KB file.
 */
import { season, confidence, colorDNA } from "../../../../server/demo-analyses/sample-1.json";
import { heroSix, type Color } from "../../../../server/utils/seasonPalettes";
import { getSeasonMakeup, type MakeupShade } from "../../../../server/utils/seasonMakeup";
import { getSeasonStyle, seasonDescriptor, type HairShade, type MetalVerdict } from "../../../../server/utils/seasonStyle";
import { foundationStep } from "../../lib/foundation";

export const DEMO_SAMPLE_ID = "sample-1";

export interface DemoSummary {
  season: string;
  confidence: number;
  six: Color[];
  descriptor: string;
  beauty: { base: MakeupShade; chips: { slot: "blush" | "lip" | "eye"; shade: MakeupShade }[]; line: string };
  style: { metals: MetalVerdict[]; hair: HairShade; line: string };
}

const firstSentence = (text: string) => text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";

export function demoSummary(): DemoSummary {
  const makeup = getSeasonMakeup(season);
  const style = getSeasonStyle(season);
  if (!makeup || !style) throw new Error(`no canonical data for the demo season "${season}"`);

  const step = foundationStep(colorDNA.depth, makeup.foundation.length) ?? 0;

  return {
    season,
    confidence,
    six: heroSix(season),
    descriptor: seasonDescriptor(season),
    beauty: {
      base: makeup.foundation[step],
      chips: [
        { slot: "blush", shade: makeup.blush[0] },
        { slot: "lip", shade: makeup.lip[0] },
        { slot: "eye", shade: makeup.eye[0] },
      ],
      line: firstSentence(makeup.guidance.base),
    },
    style: {
      metals: style.metals,
      hair: style.hair[0],
      line: firstSentence(style.guidance.jewellery),
    },
  };
}
