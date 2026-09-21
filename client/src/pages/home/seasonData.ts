/**
 * Everything Home shows about a season, read from the canonical modules.
 *
 * Home sells the product with the same colours the product delivers: the
 * marquee and the preview panel read seasonPalettes, seasonMakeup and
 * seasonStyle directly, so there is no second copy to drift and no hex in any
 * Home component. tests/homeLanding.test.ts holds that line.
 */
import { SEASONS, type Season } from "../../../../measure/seasons.config";
import {
  getCanonicalPalette,
  type Color,
  type SeasonPalette,
} from "../../../../server/utils/seasonPalettes";
import { getSeasonMakeup, type SeasonMakeup } from "../../../../server/utils/seasonMakeup";
import {
  getSeasonStyle,
  seasonDescriptor,
  type SeasonStyle,
} from "../../../../server/utils/seasonStyle";

export interface MarqueeSeason {
  name: Season;
  descriptor: string;
  colours: Color[];
}

/** The twelve canonical seasons, in canonical order, with their twelve colours. */
export function marqueeSeasons(): MarqueeSeason[] {
  return SEASONS.map((name) => {
    const palette = getCanonicalPalette(name);
    if (!palette) throw new Error(`no canonical palette for ${name}`);
    return { name, descriptor: seasonDescriptor(name), colours: palette.best };
  });
}

/**
 * The season the "what you get" panel previews.
 *
 * Deep Autumn because it is the season the demo gallery cannot show: eight of
 * its nine faces measure in the light band, so the one place a deep palette
 * can be seen before uploading is here.
 */
export const PREVIEW_SEASON: Season = "Deep Autumn";

export interface SeasonPreview {
  name: Season;
  descriptor: string;
  palette: SeasonPalette;
  makeup: SeasonMakeup;
  style: SeasonStyle;
}

export function previewSeason(): SeasonPreview {
  const palette = getCanonicalPalette(PREVIEW_SEASON);
  const makeup = getSeasonMakeup(PREVIEW_SEASON);
  const style = getSeasonStyle(PREVIEW_SEASON);
  if (!palette || !makeup || !style) throw new Error(`incomplete canonical data for ${PREVIEW_SEASON}`);
  return { name: PREVIEW_SEASON, descriptor: seasonDescriptor(PREVIEW_SEASON), palette, makeup, style };
}
