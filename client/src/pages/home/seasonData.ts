/**
 * Everything Home shows about a season, read from the canonical modules.
 *
 * Home sells the product with the same colours the product delivers: the
 * marquee reads seasonPalettes directly, so there is no second copy to drift
 * and no hex in any Home component. tests/homeLanding.test.ts holds that line.
 */
import { SEASONS, type Season } from "../../../../measure/seasons.config";
import { heroSix, type Color } from "../../../../server/utils/seasonPalettes";
import { seasonDescriptor } from "../../../../server/utils/seasonStyle";

export interface MarqueeSeason {
  name: Season;
  descriptor: string;
  /** Six: a light neutral, four colours, a dark neutral. All from the season's twelve. */
  colours: Color[];
}

/** The twelve canonical seasons, in canonical order, each with its curated six. */
export function marqueeSeasons(): MarqueeSeason[] {
  return SEASONS.map((name) => {
    const colours = heroSix(name);
    if (colours.length !== 6) throw new Error(`no hero six for ${name}`);
    return { name, descriptor: seasonDescriptor(name), colours };
  });
}
