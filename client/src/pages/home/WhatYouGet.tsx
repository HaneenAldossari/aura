import { useState } from "react";
import { useT, type Key } from "../../i18n";
import previews from "./previews.json";

/**
 * Four rows, because the app has four tabs.
 *
 * The list used to be seven features, which is a brochure's way of counting.
 * What someone actually gets is a results page with four tabs, so the list is
 * those four, in that order, under those names — and the panel beside it is
 * that tab.
 *
 * Literally that tab: each preview is a phone-width capture of the real
 * Results screen for a demo face, taken by `npm run shots -- --live --publish`,
 * which writes the images to public/previews/ and the manifest beside this
 * file. Nothing in the panel is drawn for Home, so it cannot promise something
 * the app does not do; when the app changes, re-publishing is one command.
 *
 * The frame shows the top of the tab and does not scroll. A scrolling frame is
 * a trap on a phone, where it is as wide as the screen and a thumb moving down
 * the page lands in it.
 */
type PreviewId = "overview" | "beauty" | "style" | "before-you-buy";

interface Manifest {
  season: string;
  capturedOn: string;
  tabs: Partial<Record<PreviewId, { src: string; width: number; height: number }>>;
}

const MANIFEST = previews as Manifest;

const ROWS: { id: PreviewId; title: Key; body: Key }[] = [
  { id: "overview", title: "home.landing.row1Title", body: "home.landing.row1Body" },
  { id: "beauty", title: "home.landing.row2Title", body: "home.landing.row2Body" },
  { id: "style", title: "home.landing.row3Title", body: "home.landing.row3Body" },
  { id: "before-you-buy", title: "home.landing.row4Title", body: "home.landing.row4Body" },
];

export default function WhatYouGet() {
  const t = useT();
  const [active, setActive] = useState(0);
  const row = ROWS[active];
  const shot = MANIFEST.tabs[row.id];

  return (
    <section className="lp-section lp-section--raised" aria-labelledby="lp-get-title">
      <div className="lp-shell">
        <h2 className="lp-h2" id="lp-get-title">
          {t("home.landing.getLead")} <em>{t("home.landing.getAccent")}</em>
        </h2>

        <div className="lp-get">
          <ul className="lp-get__list">
            {ROWS.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="lp-get__item"
                  aria-pressed={active === i}
                  aria-controls="lp-get-panel"
                  onClick={() => setActive(i)}
                >
                  <span className="lp-get__title">{t(r.title)}</span>
                  <span className="lp-get__body">{t(r.body)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="lp-get__stage">
            <div className="lp-panel" id="lp-get-panel">
              <div className="lp-panel__head">
                <span className="lp-panel__brand">
                  <span className="lp-panel__dot" aria-hidden="true" />
                  {t("common.brandName")}
                  {MANIFEST.season ? ` · ${MANIFEST.season}` : ""}
                </span>
                <span className="lp-panel__label">{t(row.title)}</span>
              </div>

              {/* Keyed, so each change remounts and the crossfade plays again. */}
              <div
                className="lp-panel__screen lp-swap"
                key={row.id}
                role="img"
                aria-label={t("home.landing.previewAlt", { tab: t(row.title), season: MANIFEST.season })}
              >
                {shot && (
                  <img
                    src={shot.src}
                    width={shot.width}
                    height={shot.height}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
            </div>
            <p className="lp-get__note">{t("home.landing.previewNote")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
