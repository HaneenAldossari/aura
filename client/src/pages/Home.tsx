import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import StarField from "../components/StarField";
import { useT } from "../i18n";
import ColourField from "./home/ColourField";
import "../pages/results/results-editorial.css";
import "./home/home-editorial.css";

/**
 * The landing page.
 *
 * Centred hero in the first viewport, the twelve palettes under it, and how it
 * works below the fold. The claim and the evidence sit in one screen: "measured,
 * not guessed" is above a hundred and forty-four real palette colours read from
 * the same module an analysis injects from.
 */
export default function Home() {
  const t = useT();
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState(0);

  /**
   * The field fades over the first 40% of the viewport as how-it-works arrives.
   *
   * Driven by scroll position rather than IntersectionObserver because it is a
   * continuous value, not a threshold. Written straight to a ref's style — one
   * opacity write per frame, no React render in a scroll handler.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const limit = window.innerHeight * 0.4;
        setFade(Math.min(1, window.scrollY / limit));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const steps = [
    { n: "01", title: t("home.howItWorks.step1Title"), body: t("home.howItWorks.step1Body") },
    { n: "02", title: t("home.howItWorks.step2Title"), body: t("home.howItWorks.step2Body") },
    { n: "03", title: t("home.howItWorks.step3Title"), body: t("home.howItWorks.step3Body") },
  ];

  return (
    <div className="ed-page">
      {/* Low density, and the only other motion on this page. */}
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="ed-shell">
          <header className="ed-masthead">
            <span className="ed-wordmark">{t("common.brandName")}</span>
            <span className="ed-masthead__meta">{t("home.kicker")}</span>
          </header>

          <div className="home-hero">
            <p className="home-eyebrow">{t("home.eyebrow2")}</p>
            <h1 className="home-title">
              <span className="home-title__line">{t("home.heroLine1")}</span>
              <span className="home-title__line">{t("home.heroLine2")}</span>
              <span className="home-title__line">{t("home.heroLine3")}</span>
              <span className="home-title__accent">{t("home.heroAccent")}</span>
            </h1>
            <p className="home-lede">{t("home.lede2")}</p>
            <div className="home-cta">
              <Link className="ed-button" to="/analyze">
                {t("home.ctaPrimary2")}
              </Link>
              <Link className="ed-link" to="/analyze?samples=1">
                {t("home.ctaSample")}
              </Link>
            </div>
          </div>
        </div>

        <div
          ref={fieldRef}
          style={{ opacity: 1 - fade, transition: "opacity 120ms linear" }}
          aria-hidden={fade > 0.9}
        >
          <ColourField />
        </div>

        <div className="ed-shell home-how">
          <h2 className="ed-section__label">{t("home.howItWorks.title")}</h2>
          <div className="home-steps">
            {steps.map((step) => (
              <div className="home-step" key={step.n}>
                <span className="home-step__n ltr-run">{step.n}</span>
                <div>
                  <p className="home-step__title">{step.title}</p>
                  <p className="home-step__body">{step.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="home-foot" style={{ marginBlockStart: "var(--space-6)" }}>
            <p className="home-foot__privacy">{t("home.privacy")}</p>
            <span className="home-foot__source">{t("home.field.source")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
