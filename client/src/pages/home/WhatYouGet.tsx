import { useMemo, useState, type ReactNode } from "react";
import { useT, type Key } from "../../i18n";
import { metalColours } from "../../lib/metals";
import type { Color } from "../../../../server/utils/seasonPalettes";
import { previewSeason, type SeasonPreview } from "./seasonData";

const VERDICT_KEY: Record<string, Key> = {
  best: "results.styleSection.verdictBest",
  works: "results.styleSection.verdictWorks",
  skip: "results.styleSection.verdictSkip",
};

/**
 * Flat rectangles. Unnamed, they run edge to edge in one row; `named` puts the
 * shade name under each and wraps at `cols`, because a name needs about 80px
 * and twelve of them do not fit in one row of a 400px panel.
 */
function Strip({
  colours,
  named = false,
  struck = false,
  cols = 4,
}: {
  colours: Color[];
  named?: boolean;
  struck?: boolean;
  cols?: number;
}) {
  return (
    <ul
      className="lp-strip"
      data-named={named || undefined}
      data-struck={struck || undefined}
      style={named ? { ["--cols" as string]: cols } : undefined}
    >
      {colours.map((colour) => (
        <li key={colour.name} title={colour.name}>
          <span className="lp-strip__chip" style={{ background: colour.hex }} />
          {named && <span className="lp-strip__name">{colour.name}</span>}
        </li>
      ))}
    </ul>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="lp-row">
      <p className="lp-row__label">{label}</p>
      {children}
    </div>
  );
}

interface Feature {
  id: string;
  title: Key;
  body: Key;
  panel: Key;
  render: (season: SeasonPreview, t: ReturnType<typeof useT>) => ReactNode;
}

/**
 * Seven things an analysis returns, and what each actually looks like.
 *
 * The panel is not a mockup. Every colour, shade name, verdict and sentence in
 * it is the canonical data for one season — the same modules the results page
 * is built from — so what is promised here is literally what is delivered.
 * Colours are flat rectangles; only nails and gems are renders, as on Results.
 */
const FEATURES: Feature[] = [
  {
    id: "season",
    title: "home.landing.f1Title",
    body: "home.landing.f1Body",
    panel: "home.landing.f1Panel",
    render: (s) => (
      <>
        <p className="lp-panel__season">{s.name}</p>
        <p className="lp-panel__line">{s.descriptor}</p>
        <Strip colours={s.palette.best} />
        <p className="lp-panel__prose">{s.style.story}</p>
      </>
    ),
  },
  {
    id: "palette",
    title: "home.landing.f2Title",
    body: "home.landing.f2Body",
    panel: "home.landing.f2Panel",
    render: (s, t) => (
      <>
        <Row label={t("home.landing.rowBest")}>
          <Strip colours={s.palette.best} named />
        </Row>
        <Row label={t("home.landing.rowNeutrals")}>
          <Strip colours={s.palette.neutrals} named />
        </Row>
        <Row label={t("home.landing.rowAvoid")}>
          <Strip colours={s.palette.avoid} struck />
        </Row>
      </>
    ),
  },
  {
    id: "beauty",
    title: "home.landing.f3Title",
    body: "home.landing.f3Body",
    panel: "home.landing.f3Panel",
    render: (s, t) => (
      <>
        <Row label={t("results.makeupSection.catBlush")}>
          <Strip colours={s.makeup.blush.slice(0, 4)} named />
        </Row>
        <Row label={t("results.makeupSection.catLip")}>
          <Strip colours={s.makeup.lip.slice(0, 4)} named />
        </Row>
        <Row label={t("results.makeupSection.catEye")}>
          <Strip colours={s.makeup.eye.slice(0, 4)} named />
        </Row>
        <p className="lp-panel__prose">{s.makeup.guidance.lip}</p>
      </>
    ),
  },
  {
    id: "nails",
    title: "home.landing.f4Title",
    body: "home.landing.f4Body",
    panel: "home.landing.f4Panel",
    render: (s) => (
      <>
        <ul className="lp-renders lp-renders--nails">
          {s.makeup.nails.map((shade) => (
            <li key={shade.name}>
              {shade.asset ? (
                <img src={`/makeup/nails/${shade.asset}.webp`} alt="" loading="lazy" decoding="async" />
              ) : (
                <span className="lp-strip__chip" style={{ background: shade.hex }} />
              )}
              <span className="lp-strip__name">{shade.name}</span>
            </li>
          ))}
        </ul>
        <p className="lp-panel__prose">{s.makeup.guidance.nails}</p>
      </>
    ),
  },
  {
    id: "metals",
    title: "home.landing.f5Title",
    body: "home.landing.f5Body",
    panel: "home.landing.f5Panel",
    render: (s, t) => (
      <>
        <ul className="lp-metals">
          {s.style.metals.map((metal) => {
            const { hex, accent } = metalColours(metal.name);
            return (
              <li key={metal.name} data-verdict={metal.verdict}>
                <span
                  className="lp-metals__disc"
                  style={{ background: `linear-gradient(140deg, ${accent}, ${hex} 65%)` }}
                  aria-hidden="true"
                />
                <span className="lp-metals__name">{metal.name}</span>
                <span className="lp-metals__verdict">{t(VERDICT_KEY[metal.verdict])}</span>
                <span className="lp-metals__reason">{metal.reason}</span>
              </li>
            );
          })}
        </ul>
        <p className="lp-panel__prose">{s.style.guidance.jewellery}</p>
      </>
    ),
  },
  {
    id: "gems",
    title: "home.landing.f6Title",
    body: "home.landing.f6Body",
    panel: "home.landing.f6Panel",
    render: (s) => (
      <ul className="lp-renders lp-renders--gems">
        {s.style.gemstones.slice(0, 4).map((stone) => (
          <li key={stone.name}>
            {stone.asset ? (
              <img src={`/makeup/gems/${stone.asset}.webp`} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="lp-strip__chip" style={{ background: stone.hex }} />
            )}
            <span className="lp-strip__name">{stone.name}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "buy",
    title: "home.landing.f7Title",
    body: "home.landing.f7Body",
    panel: "home.landing.f7Panel",
    render: (s, t) => (
      <>
        <Row label={t("home.landing.rowScoredAgainst")}>
          <Strip colours={s.palette.best} />
        </Row>
        <Row label={t("home.landing.rowMarkedDown")}>
          <Strip colours={s.palette.avoid} named cols={3} />
        </Row>
      </>
    ),
  },
];

export default function WhatYouGet() {
  const t = useT();
  const season = useMemo(() => previewSeason(), []);
  const [active, setActive] = useState(0);
  const feature = FEATURES[active];

  return (
    <section className="lp-section lp-section--raised" aria-labelledby="lp-get-title">
      <div className="lp-shell">
        <h2 className="lp-h2" id="lp-get-title">
          {t("home.landing.getLead")} <em>{t("home.landing.getAccent")}</em>
        </h2>

        <div className="lp-get">
          <ul className="lp-get__list">
            {FEATURES.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="lp-get__item"
                  aria-pressed={active === i}
                  aria-controls="lp-get-panel"
                  onClick={() => setActive(i)}
                >
                  <span className="lp-get__title">{t(f.title)}</span>
                  <span className="lp-get__body">{t(f.body)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="lp-get__stage">
            <div className="lp-panel" id="lp-get-panel" aria-live="polite">
              <div className="lp-panel__head">
                <span className="lp-panel__brand">
                  <span className="lp-panel__dot" aria-hidden="true" />
                  {t("common.brandName")} · {season.name}
                </span>
                <span className="lp-panel__label">{t(feature.panel)}</span>
              </div>

              {/* Keyed, so each change remounts and the crossfade plays again. */}
              <div className="lp-panel__body lp-swap" key={feature.id}>
                {feature.render(season, t)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
