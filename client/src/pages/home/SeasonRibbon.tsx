import { useMemo } from "react";
import { allSeasonPalettes } from "../../../../server/utils/seasonPalettes";
import { useT } from "../../i18n";

/**
 * All twelve seasons, drifting past at 8px per second.
 *
 * Read straight from seasonPalettes.ts — the same module the analysis injects
 * from — so the colours on the landing page are the colours a result gives you.
 * A hand-copied set here would drift the moment a palette was tuned, and the
 * first person to notice would be someone comparing their result to the page
 * that sold it to them.
 *
 * One season holds the focus at a time: its bars come up to full opacity while
 * the rest sit at 45%, and its name goes from muted to gold. The dim applies to
 * the *bars only* — 13px type at 45% opacity measures about 3:1, which fails
 * the contrast floor, so the name carries its state in hue instead.
 *
 * The whole thing is decorative and aria-hidden: the same twelve palettes are
 * reachable as real content elsewhere, and a screen reader has no use for a
 * hundred and forty-four colour swatches drifting sideways.
 */

/** One season block: bars plus the gap after it. Sets the animation distance. */
const BLOCK_DESKTOP = 480;
const BLOCK_PHONE = 388;
const SPEED_PX_PER_SEC = 8;

export default function SeasonRibbon({ narrow = false }: { narrow?: boolean }) {
  const t = useT();
  const seasons = useMemo(() => allSeasonPalettes(), []);

  const block = narrow ? BLOCK_PHONE : BLOCK_DESKTOP;
  const cycle = block * seasons.length;
  const duration = cycle / SPEED_PX_PER_SEC;

  // Rendered twice so the translate can loop seamlessly: by the time the first
  // copy has left, the second is exactly where the first started.
  const track = [...seasons, ...seasons];

  return (
    <section className="ribbon" aria-labelledby="ribbon-label">
      <div className="ed-shell">
        <h2 className="ed-section__label" id="ribbon-label">
          {t("home.ribbon.title")}
        </h2>
        <hr className="ed-rule" />
      </div>

      <div className="ribbon__viewport">
        <div
          className="ribbon__track"
          aria-hidden
          style={{
            // Custom properties rather than a generated stylesheet: the distance
            // depends on how many seasons exist, which is data, not design.
            ["--ribbon-distance" as string]: `-${cycle}px`,
            ["--ribbon-duration" as string]: `${duration}s`,
          }}
        >
          {track.map((entry, i) => (
            <div
              className="ribbon__season"
              key={`${entry.season}-${i}`}
              style={{
                inlineSize: block,
                // Each block reaches full colour as it crosses the centre. The
                // offset is negative so the cycle is already underway when the
                // block appears, rather than every block flashing at once.
                ["--ribbon-delay" as string]: `${-(i % seasons.length) * (duration / seasons.length)}s`,
              }}
            >
              <span className="ribbon__name">{entry.season}</span>
              <span className="ribbon__bars">
                {entry.palette.best.slice(0, 12).map((colour) => (
                  <span
                    className="ribbon__bar"
                    key={colour.hex}
                    style={{ background: colour.hex }}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="ed-shell ribbon__foot">
        <p className="ribbon__privacy">{t("home.privacy")}</p>
        <span className="ribbon__source">{t("home.ribbon.source")}</span>
      </div>
    </section>
  );
}
