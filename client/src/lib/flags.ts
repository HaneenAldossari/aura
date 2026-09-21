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
 * Off. Everything it needs is still here — the canvas renderer, the
 * flow-circle ordering in seasonPalettes.ts, the keyboard layer, the panel —
 * and it still mounts at the foot of the hero when this is true.
 *
 * It is no longer this line and nothing else, though. The hero was rebuilt
 * from the Lovable landing page, whose rule is one ambient effect, and that
 * effect is the particle canvas. The field's acceptance suite
 * (scripts/dev/_hero.ts) was written against the previous hero and needs a
 * pass before it means anything again. Decide: re-fit it, or delete it.
 */
export const SHOW_COLOUR_FIELD = false;
