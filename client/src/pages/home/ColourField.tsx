import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { allSeasonPalettes } from "../../../../server/utils/seasonPalettes";
import { useT } from "../../i18n";

/**
 * Twelve palettes, twelve bands, the whole system in one view.
 *
 * Read straight from seasonPalettes.ts — the same module an analysis injects
 * from — so the colours selling the product are the colours it delivers. A
 * hand-copied set would drift the first time a palette was tuned, and the first
 * person to notice would be someone comparing their result against the page
 * that sold it to them.
 *
 * Performance is the whole design here. Every band is one element with a
 * `transform` and an `opacity`, both compositor properties, so the drift never
 * touches layout or paint. The sine is computed once per frame for twelve
 * elements and written as a custom property — no per-swatch work, no React
 * state in the loop, and the whole animation stops when the field scrolls out
 * of view or the tab is hidden.
 */

/** Slow, and each band on its own period so the field never pulses together. */
const DRIFT_PX = 6;
const PERIOD_MIN = 12_000;
const PERIOD_MAX = 18_000;

export default function ColourField() {
  const t = useT();
  const navigate = useNavigate();
  const seasons = useMemo(() => allSeasonPalettes(), []);
  const fieldRef = useRef<HTMLDivElement>(null);
  const bandRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const [opened, setOpened] = useState<number | null>(null);

  /** Period and phase per band, fixed for the life of the component. */
  const timing = useMemo(
    () =>
      seasons.map((_, i) => ({
        period: PERIOD_MIN + ((i * 2654435761) % (PERIOD_MAX - PERIOD_MIN)),
        phase: ((i * 2654435761) % 1000) / 1000,
      })),
    [seasons]
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let frame = 0;
    let running = true;

    const tick = (now: number) => {
      if (!running) return;
      for (let i = 0; i < bandRefs.current.length; i++) {
        const el = bandRefs.current[i];
        if (!el) continue;
        const { period, phase } = timing[i];
        const x = Math.sin(((now / period) + phase) * Math.PI * 2) * DRIFT_PX;
        // A custom property rather than style.transform, so the hover scale in
        // CSS composes with the drift instead of fighting it.
        el.style.setProperty("--drift", `${x.toFixed(2)}px`);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Stop when off-screen or backgrounded: this is decoration, and decoration
    // has no business spending battery nobody is looking at.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          frame = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting) {
          running = false;
          cancelAnimationFrame(frame);
        }
      },
      { threshold: 0 }
    );
    if (fieldRef.current) observer.observe(fieldRef.current);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timing]);

  const open = opened === null ? null : seasons[opened];

  return (
    <div
      className={`field${focused !== null ? " field--focusing" : ""}`}
      ref={fieldRef}
      onMouseLeave={() => setFocused(null)}
    >
      {seasons.map((entry, i) => (
        <div
          className={`field__band${focused === i ? " field__band--on" : ""}`}
          key={entry.season}
          ref={(el) => {
            bandRefs.current[i] = el;
          }}
          onMouseEnter={() => setFocused(i)}
          onFocus={() => setFocused(i)}
          onBlur={() => setFocused(null)}
        >
          <button
            type="button"
            className="field__hit"
            onClick={() => setOpened(i)}
            aria-label={t("home.field.open", { season: entry.season })}
          >
            {entry.palette.best.slice(0, 12).map((colour) => (
              <span
                className="field__swatch"
                key={colour.hex}
                style={{ background: colour.hex }}
              />
            ))}
          </button>
          <span className="field__name" aria-hidden>
            {entry.season}
          </span>
        </div>
      ))}

      {open && (
        <div className="field__panel" role="dialog" aria-label={open.season}>
          <div className="field__panel-head">
            <p className="field__panel-title">{open.season}</p>
            <button
              type="button"
              className="field__panel-close"
              onClick={() => setOpened(null)}
              aria-label={t("common.close")}
            >
              ×
            </button>
          </div>
          <div className="field__panel-swatches">
            {open.palette.best.slice(0, 12).map((colour) => (
              <span key={colour.hex} style={{ background: colour.hex }} title={colour.name} />
            ))}
          </div>
          <button type="button" className="ed-button" onClick={() => navigate("/analyze")}>
            {t("home.field.cta")}
          </button>
        </div>
      )}
    </div>
  );
}
