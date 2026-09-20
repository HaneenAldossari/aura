import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StarField from "../components/StarField";
import { useT } from "../i18n";
import SeasonRibbon from "./home/SeasonRibbon";
import "../pages/results/results-editorial.css";
import "./home/home-editorial.css";

/**
 * The landing page, rebuilt to the editorial direction.
 *
 * Two claims carry the page and both are literal: the measurement runs in the
 * browser, and the twelve palettes drifting along the bottom are the same ones
 * an analysis returns. Everything that used to sit between — the mock result
 * card, the carousel, the poetry section — went, because none of it was true
 * of a specific person and all of it delayed the only button that matters.
 */
export default function Home() {
  const t = useT();
  const [narrow, setNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const steps = [
    { n: "01", title: t("home.howItWorks.step1Title"), body: t("home.howItWorks.step1Body") },
    { n: "02", title: t("home.howItWorks.step2Title"), body: t("home.howItWorks.step2Body") },
    { n: "03", title: t("home.howItWorks.step3Title"), body: t("home.howItWorks.step3Body") },
  ];

  return (
    <div className="ed-page">
      {/* Low density, as the design specifies for ambient pages. */}
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div className="ed-shell">
          <header className="ed-masthead">
            <span className="ed-wordmark">{t("common.brandName")}</span>
            <span className="ed-masthead__meta">{t("home.kicker")}</span>
          </header>

          <div className="home-hero">
            <div>
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
                {/* Opens the upload screen with the sample gallery revealed. */}
                <Link className="ed-link" to="/analyze?samples=1">
                  {t("home.ctaSample")}
                </Link>
              </div>
            </div>

            <div>
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
            </div>
          </div>
        </div>

        <SeasonRibbon narrow={narrow} />
      </div>
    </div>
  );
}
