import { lazy, Suspense, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { useT } from "../../i18n";
import { SHOW_COLOUR_FIELD } from "../../lib/flags";
import { useReducedMotion } from "../../lib/useReducedMotion";
import { STEPS_ID } from "./anchors";
import HeroParticles from "./HeroParticles";

/** Lazy, so the field costs the Home bundle nothing while its flag is off. */
const ColourField = lazy(() => import("./ColourField"));

/** Entrance order, in seconds. The delays are the choreography; `.lp-rise` is the motion. */
const ENTER = { eyebrow: 0, title: 0.2, lede: 0.4, actions: 0.6, trust: 0.8 } as const;

const delay = (seconds: number) => ({ ["--d" as string]: `${seconds}s` });

export default function Hero() {
  const t = useT();
  const reduced = useReducedMotion();

  /** The href still works without this; it only adds the glide, and only if motion is welcome. */
  const toSteps = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(STEPS_ID);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${STEPS_ID}`);
  };

  return (
    <section className="lp-hero">
      {!reduced && <HeroParticles />}

      <header className="lp-bar">
        <span className="lp-bar__mark">{t("common.brandName")}</span>
        <Link className="lp-bar__link" to="/analyse">
          {t("common.getStarted")}
        </Link>
      </header>

      <div className="lp-hero__copy">
        <p className="lp-eyebrow lp-rise" style={delay(ENTER.eyebrow)}>
          {t("home.landing.eyebrow")}
        </p>

        <h1 className="lp-hero__title lp-rise" style={delay(ENTER.title)}>
          {t("home.titleLine1")}
          <br className="lp-hero__break" /> {t("home.titleLine2Lead")}{" "}
          <em>{t("home.titleLine2Accent")}</em>
        </h1>

        <p className="lp-hero__lede lp-rise" style={delay(ENTER.lede)}>
          {t("home.lede")}
        </p>

        <div className="lp-hero__actions lp-rise" style={delay(ENTER.actions)}>
          <Link className="cta cta--primary" to="/analyse">
            {t("home.ctaPrimary2")}
          </Link>
          <a className="cta cta--secondary" href={`#${STEPS_ID}`} onClick={toSteps}>
            {t("home.landing.ctaHow")}
          </a>
          <Link className="cta cta--secondary" to="/analyse#samples">
            {t("home.ctaSample")}
          </Link>
        </div>

        <div className="lp-rise" style={delay(ENTER.trust)}>
          <ul className="lp-trust">
            <li>{t("home.landing.trust1")}</li>
            <li>{t("home.landing.trust2")}</li>
            <li>{t("home.landing.trust3")}</li>
          </ul>
          <p className="lp-privacy">{t("home.privacy")}</p>
        </div>
      </div>

      {SHOW_COLOUR_FIELD ? (
        <Suspense fallback={null}>
          <ColourField />
        </Suspense>
      ) : (
        <span className="lp-hero__scroll" aria-hidden="true" />
      )}
    </section>
  );
}
