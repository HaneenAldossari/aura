import { useMemo, useState } from "react";
import { useT } from "../../i18n";
import { useReducedMotion } from "../../lib/useReducedMotion";
import { marqueeSeasons, type MarqueeSeason } from "./seasonData";

function SeasonCard({ season, clone = false }: { season: MarqueeSeason; clone?: boolean }) {
  return (
    <li className="lp-season" data-season={season.name} aria-hidden={clone || undefined}>
      <h3 className="lp-season__name">{season.name}</h3>
      {/* A colour is a flat rectangle: twelve of them, in palette order. */}
      <span className="lp-season__swatches" aria-hidden="true">
        {season.colours.map((colour) => (
          <span
            key={colour.name}
            className="lp-season__swatch"
            data-hex={colour.hex}
            title={colour.name}
            style={{ background: colour.hex }}
          />
        ))}
      </span>
      <p className="lp-season__line">{season.descriptor}</p>
    </li>
  );
}

/**
 * Twelve season cards on a slow belt.
 *
 * Exactly twelve — the canonical list, in canonical order — each with the
 * twelve colours an analysis for that season would hand back. The belt is
 * seamless because the row is laid out twice and travels half its own width;
 * the second copy is hidden from assistive tech, so a screen reader meets
 * twelve seasons, not twenty-four.
 *
 * It stops under a pointer, under a finger and under keyboard focus. With
 * reduced motion there is no belt at all: no second copy, no animation, just
 * the twelve cards in a row that scrolls by hand.
 */
export default function SeasonMarquee() {
  const t = useT();
  const reduced = useReducedMotion();
  const seasons = useMemo(() => marqueeSeasons(), []);
  const [held, setHeld] = useState(false);

  return (
    <section className="lp-section lp-section--raised lp-marquee" aria-labelledby="lp-marquee-title">
      <h2 className="lp-h2" id="lp-marquee-title">
        {t("home.landing.marqueeLead")} <em>{t("home.landing.marqueeAccent")}</em>
      </h2>

      <div
        className="lp-marquee__window"
        data-static={reduced || undefined}
        data-held={held || undefined}
        onTouchStart={() => setHeld(true)}
        onTouchEnd={() => setHeld(false)}
        onTouchCancel={() => setHeld(false)}
      >
        <ul className="lp-marquee__belt">
          {seasons.map((season) => (
            <SeasonCard key={season.name} season={season} />
          ))}
          {!reduced && seasons.map((season) => <SeasonCard key={`${season.name}-clone`} season={season} clone />)}
        </ul>
      </div>
    </section>
  );
}
