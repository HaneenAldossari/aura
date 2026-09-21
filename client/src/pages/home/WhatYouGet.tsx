import { useMemo, useState, type ReactNode } from "react";
import { useT, type Key } from "../../i18n";
import { displayed, shopHeadline, SHOP_HEADLINE_KEY } from "../../lib/bands";
import { metalColours } from "../../lib/metals";
import type { LinkCheckResultData } from "../../lib/types";
import { demoSummary, type DemoSummary } from "./demoSummary";

/**
 * Four rows, because the app has four tabs — and beside them one fixed-height
 * card that summarises the selected tab.
 *
 * A summary, not a screenshot: a capture of a long screen in a short frame is
 * cut-off content, and it is a second copy of numbers that change when the
 * analysis is regenerated. Every value here is read from the demo analysis the
 * Results page itself loads (demoSummary.ts), so Home and the page it links to
 * cannot disagree, and each card is composed to fit its frame rather than
 * cropped to it.
 *
 * Colours are flat rectangles, as everywhere; the one photograph is the product.
 */

/**
 * The precomputed shop check (scripts/precomputeDemoCheck.ts). Globbed rather
 * than imported, so the page still builds before the check has been run — the
 * card then says so plainly instead of inventing a score.
 */
interface DemoCheck {
  image: string;
  imageWidth: number;
  imageHeight: number;
  season: string;
  result: LinkCheckResultData;
}
const CHECKS = import.meta.glob<DemoCheck>("../../../../server/demo-checks/black-dress.json", {
  eager: true,
  import: "default",
});
const DEMO_CHECK: DemoCheck | null = Object.values(CHECKS)[0] ?? null;

const VERDICT_KEY: Record<string, Key> = {
  best: "results.styleSection.verdictBest",
  works: "results.styleSection.verdictWorks",
  skip: "results.styleSection.verdictSkip",
};

const SLOT_KEY = {
  blush: "results.makeupSection.catBlush",
  lip: "results.makeupSection.catLip",
  eye: "results.makeupSection.catEye",
} as const satisfies Record<string, Key>;

function Strip({ colours }: { colours: { name: string; hex: string }[] }) {
  return (
    <span className="lp-card__strip" role="img" aria-label={colours.map((c) => c.name).join(", ")}>
      {colours.map((c) => (
        <span key={c.name} title={c.name} style={{ background: c.hex }} />
      ))}
    </span>
  );
}

type T = ReturnType<typeof useT>;

const CARDS: { id: string; title: Key; body: Key; render: (d: DemoSummary, t: T) => ReactNode }[] = [
  {
    id: "overview",
    title: "home.landing.row1Title",
    body: "home.landing.row1Body",
    render: (d, t) => (
      <>
        <p className="lp-card__season">{d.season}</p>
        <p className="lp-card__confidence">{t("results.confidence", { percent: d.confidence })}</p>
        <Strip colours={d.six} />
        <p className="lp-card__line">{d.descriptor}</p>
      </>
    ),
  },
  {
    id: "beauty",
    title: "home.landing.row2Title",
    body: "home.landing.row2Body",
    render: (d, t) => (
      <>
        <div className="lp-card__base">
          <span className="lp-card__swatch lp-card__swatch--base" style={{ background: d.beauty.base.hex }} />
          <span>
            <span className="lp-card__label">{t("home.landing.cardBase")}</span>
            <span className="lp-card__name">{d.beauty.base.name}</span>
          </span>
        </div>
        <ul className="lp-card__chips">
          {d.beauty.chips.map(({ slot, shade }) => (
            <li key={slot}>
              <span className="lp-card__swatch" style={{ background: shade.hex }} />
              <span className="lp-card__label">{t(SLOT_KEY[slot])}</span>
              <span className="lp-card__name">{shade.name}</span>
            </li>
          ))}
        </ul>
        <p className="lp-card__line">{d.beauty.line}</p>
      </>
    ),
  },
  {
    id: "style",
    title: "home.landing.row3Title",
    body: "home.landing.row3Body",
    render: (d, t) => (
      <>
        <ul className="lp-card__metals">
          {d.style.metals.map((metal) => {
            const { hex, accent } = metalColours(metal.name);
            return (
              <li key={metal.name} data-verdict={metal.verdict}>
                <span className="lp-card__disc" style={{ background: `linear-gradient(140deg, ${accent}, ${hex} 65%)` }} />
                <span className="lp-card__name">{metal.name}</span>
                <span className="lp-card__verdict">{t(VERDICT_KEY[metal.verdict])}</span>
              </li>
            );
          })}
        </ul>
        <div className="lp-card__base">
          <span
            className="lp-card__swatch lp-card__swatch--base"
            style={{ background: `linear-gradient(180deg, ${d.style.hair.hex} 0%, ${d.style.hair.accent} 100%)` }}
          />
          <span>
            <span className="lp-card__label">{t("home.landing.cardHair")}</span>
            <span className="lp-card__name">{d.style.hair.name}</span>
          </span>
        </div>
        <p className="lp-card__line">{d.style.line}</p>
      </>
    ),
  },
  {
    id: "before-you-buy",
    title: "home.landing.row4Title",
    body: "home.landing.row4Body",
    render: (d, t) => {
      if (!DEMO_CHECK) return <p className="lp-card__line">{t("home.landing.cardCheckPending")}</p>;
      const { result } = DEMO_CHECK;
      return (
        <>
          <div className="lp-card__buy">
            <img
              className="lp-card__photo"
              src={DEMO_CHECK.image}
              width={DEMO_CHECK.imageWidth}
              height={DEMO_CHECK.imageHeight}
              alt={result.productName}
              loading="lazy"
              decoding="async"
            />
            <div>
              <p className="lp-card__score ltr-run">
                {displayed(result.matchScore)}
                <span> / 100</span>
              </p>
              <p className="lp-card__verdictword">{t(SHOP_HEADLINE_KEY[shopHeadline(result.matchScore)])}</p>
            </div>
          </div>
          <Strip colours={d.six} />
        </>
      );
    },
  },
];

export default function WhatYouGet() {
  const t = useT();
  const demo = useMemo(() => demoSummary(), []);
  const [active, setActive] = useState(0);
  const card = CARDS[active];

  return (
    <section className="lp-section lp-section--raised" aria-labelledby="lp-get-title">
      <div className="lp-shell">
        <h2 className="lp-h2" id="lp-get-title">
          {t("home.landing.getLead")} <em>{t("home.landing.getAccent")}</em>
        </h2>

        <div className="lp-get">
          <ul className="lp-get__list">
            {CARDS.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="lp-get__item"
                  aria-pressed={active === i}
                  aria-controls="lp-get-panel"
                  onClick={() => setActive(i)}
                >
                  <span className="lp-get__title">{t(c.title)}</span>
                  <span className="lp-get__body">{t(c.body)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="lp-get__stage">
            <div className="lp-panel" id="lp-get-panel" aria-live="polite">
              <div className="lp-panel__head">
                <span className="lp-panel__brand">
                  <span className="lp-panel__dot" aria-hidden="true" />
                  {t("common.brandName")} · {demo.season}
                </span>
                <span className="lp-panel__label">{t(card.title)}</span>
              </div>

              {/* Keyed, so each change remounts and the crossfade plays again. */}
              <div className="lp-card lp-swap" key={card.id} data-card={card.id}>
                {card.render(demo, t)}
              </div>
            </div>
            <p className="lp-get__note">{t("home.landing.previewNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
