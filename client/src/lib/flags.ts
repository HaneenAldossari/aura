/**
 * Build-time switches for work that is finished but not in front of people yet.
 *
 * A flag here means the code is tested and kept, not abandoned — if something
 * is never coming back it should be deleted rather than flagged, because a
 * permanent `false` is just dead code with a comment on it.
 */

/**
 * The Home colour field: twelve canonical palettes drifting across the bottom
 * of the hero.
 *
 * Off while the hero is judged on its copy alone. Everything it needs is still
 * here — the canvas renderer, the flow-circle ordering in seasonPalettes.ts,
 * the keyboard layer, the panel and its acceptance suite
 * (scripts/dev/_hero.ts) — so turning it on is this line and nothing else.
 */
export const SHOW_COLOUR_FIELD = false;
