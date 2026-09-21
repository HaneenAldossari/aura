import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import StarField from "../components/StarField";
import { useT } from "../i18n";
import ColourField from "./home/ColourField";
import "./home/home-editorial.css";

/**
 * One screen, one interaction.
 *
 * The claim and its evidence sit in the same viewport: "measured, not guessed"
 * above a hundred and forty-four real palette colours, read from the module an
 * analysis injects from. Everything else is below the fold.
 */

/** Entrance order. Delays are the choreography; the classes are the motion. */
const ENTER = {
  mark: 0.06,
  label: 0.14,
  eyebrow: 0.18,
  line1: 0.3,
  line2: 0.42,
  line3: 0.54,
  line4: 0.68,
  ink: 0.8,
  lede: 0.92,
  primary: 1.06,
  secondary: 1.18,
} as const;

export default function Home() {
  const t = useT();
  const fieldWrap = useRef<HTMLDivElement>(null);

  /**
   * Mark each entrance element done on its own animationend.
   *
   * Two reasons rather than one timer: an element that finishes early stops
   * holding a transform, and if animations never ran at all the rAF fallback
   * below reveals everything. The page is never blank because `.appear` rests
   * at opacity 1 — the animation only ever takes it away and gives it back.
   */
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".appear"));
    const done = (e: Event) => (e.currentTarget as HTMLElement).classList.add("is-in");
    nodes.forEach((n) => n.addEventListener("animationend", done, { once: true }));

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        for (const node of nodes) {
          const running = node.getAnimations?.() ?? [];
          if (running.length === 0) node.classList.add("is-in");
        }
      });
    });

    return () => {
      nodes.forEach((n) => n.removeEventListener("animationend", done));
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  /**
   * The field fades across the first 40vh of scroll.
   *
   * Written straight to the element — one opacity write per frame, and no React
   * render inside a scroll handler.
   */
  useEffect(() => {
    const el = fieldWrap.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const limit = window.innerHeight * 0.4;
        const progress = Math.min(1, window.scrollY / limit);
        el.style.opacity = String(1 - progress);
        el.style.pointerEvents = progress > 0.9 ? "none" : "";
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
    <main id="home" className="ed-page">
      <StarField maxOpacity={0.28} minDuration={4} durationRange={5} />

      <header className="site-header">
        <span className="site-header__mark appear a-soft" style={{ ["--d" as string]: `${ENTER.mark}s` }}>
          {t("common.brandName")}
        </span>
        <span />
        <span className="site-header__label appear a-soft" style={{ ["--d" as string]: `${ENTER.label}s` }}>
          {t("home.kicker")}
        </span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="hero__eyebrow appear a-soft" style={{ ["--d" as string]: `${ENTER.eyebrow}s` }}>
            {t("home.eyebrow2")}
          </p>

          <h1 className="hero__title">
            <span className="hero__line appear a-mask" style={{ ["--d" as string]: `${ENTER.line1}s` }}>
              {t("home.heroLine1")}
            </span>
            <span className="hero__line appear a-mask" style={{ ["--d" as string]: `${ENTER.line2}s` }}>
              {t("home.heroLine2")}
            </span>
            <span className="hero__line appear a-mask" style={{ ["--d" as string]: `${ENTER.line3}s` }}>
              {t("home.heroLine3")}
            </span>
            <span
              className="hero__line hero__line--italic appear a-mask"
              style={{ ["--d" as string]: `${ENTER.line4}s` }}
            >
              {/* The ink settles on the inner span, so the mask and the focus
                  are two separate motions on two separate elements. */}
              <span
                className="appear a-ink"
                style={{ ["--d" as string]: `${ENTER.ink}s`, animationDuration: "1.2s" }}
              >
                {t("home.heroAccent")}
              </span>
            </span>
          </h1>

          <p
            className="hero__lede appear a-soft"
            style={{ ["--d" as string]: `${ENTER.lede}s`, animationDuration: "1.25s" }}
          >
            {t("home.lede2")}
          </p>

          <div className="hero__actions">
            <Link
              className="cta cta--primary appear a-rise"
              style={{ ["--d" as string]: `${ENTER.primary}s` }}
              to="/analyse"
            >
              {t("home.ctaPrimary2")}
            </Link>
            <Link
              className="cta cta--secondary appear a-soft"
              style={{ ["--d" as string]: `${ENTER.secondary}s` }}
              to="/analyse?samples=1"
            >
              {t("home.ctaSample")}
            </Link>
          </div>
        </div>

        <div ref={fieldWrap} style={{ transition: "opacity 120ms linear" }}>
          <ColourField />
        </div>
      </section>

      <section className="how-it-works ed-shell">
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
      </section>

      <p className="privacy-line ed-shell">{t("home.privacy")}</p>
    </main>
  );
}
