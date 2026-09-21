import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fieldPalettes } from "../../../../server/utils/seasonPalettes";
import { getSeasonStyle } from "../../../../server/utils/seasonStyle";
import { useT } from "../../i18n";
import { ease } from "../../lib/easing";
import "./colour-field.css";

/**
 * Twelve palettes, twelve bands, the whole system in one view.
 *
 * Read straight from seasonPalettes.ts — the same module an analysis injects
 * from — so the colours selling the product are the colours it delivers. In
 * flow-circle order, so hue moves smoothly band to band rather than jumping
 * between families.
 *
 * Drawn on one canvas rather than 144 elements. The idle drift moves every
 * band every frame, so a DOM implementation would be 144 style writes per
 * frame and a compositor layer per band; one canvas is a single draw call list
 * with no layout, no style recalc and one layer.
 *
 * The DOM list underneath is not decoration: it is the keyboard and screen
 * reader surface, and the fallback if canvas is unavailable. It carries the
 * real colours only in that fallback case — otherwise the canvas above paints
 * them and the list stays transparent but focusable.
 */

const BAND_COUNT = 12;
const DRIFT_PX = 6;
const DRIFT_PX_PHONE = 4;
const PERIOD_MIN = 14_000;
const PERIOD_MAX = 18_000;

/** Focus easing, and the entrance, share one duration and one curve. */
const FOCUS_MS = 200;
const ENTER_MS = 900;
const ENTER_DELAY_MS = 900;
const ENTER_STAGGER_MS = 40;

const IDLE_ALPHA = 1;
const BLUR_ALPHA = 0.72;
const FOCUS_SCALE = 1.06;

interface BandState {
  /** 0 = unfocused, 1 = focused. Interpolated, never snapped. */
  focus: number;
  target: number;
}

export default function ColourField() {
  const t = useT();
  const navigate = useNavigate();
  const seasons = useMemo(() => fieldPalettes(), []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const [canvasOk, setCanvasOk] = useState(true);
  const [opened, setOpened] = useState<number | null>(null);
  /** Touch needs a focus step before it can open, so the first tap is not blind. */
  const touchFocused = useRef<number | null>(null);

  const states = useRef<BandState[]>(
    Array.from({ length: BAND_COUNT }, () => ({ focus: 0, target: 0 }))
  );
  const focused = useRef<number | null>(null);

  /** Period and phase per band, fixed for the life of the component. */
  const timing = useMemo(
    () =>
      Array.from({ length: BAND_COUNT }, (_, i) => ({
        period: PERIOD_MIN + ((PERIOD_MAX - PERIOD_MIN) * i) / (BAND_COUNT - 1),
        phase: (Math.PI * 2 * i) / BAND_COUNT,
      })),
    []
  );

  const setFocus = useCallback((index: number | null, pointerX?: number) => {
    focused.current = index;
    for (let i = 0; i < states.current.length; i++) {
      states.current[i].target = i === index ? 1 : 0;
    }
    const label = labelRef.current;
    if (!label) return;
    if (index === null) {
      label.dataset.on = "false";
      return;
    }
    const wrap = wrapRef.current;
    const width = wrap?.clientWidth ?? 0;
    const x = Math.min(Math.max(pointerX ?? width / 2, 16), Math.max(16, width - 16));
    label.textContent = seasons[index].season;
    label.style.setProperty("--x", `${x}px`);
    label.style.setProperty("--band", String(index));
    label.dataset.on = "true";
  }, [seasons]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCanvasOk(false);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 600px)").matches;
    const amplitude = phone ? DRIFT_PX_PHONE : DRIFT_PX;

    let width = 0;
    let height = 0;
    let bandH = 0;
    let gap = 2;
    let swatchGap = 1;
    let frame = 0;
    let running = false;
    let start = performance.now();

    const readMetrics = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      const styles = getComputedStyle(wrap);
      gap = parseFloat(styles.getPropertyValue("--field-gap")) || 2;
      swatchGap = parseFloat(styles.getPropertyValue("--swatch-gap")) || 1;
      bandH = (height - (BAND_COUNT - 1) * gap) / BAND_COUNT;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < BAND_COUNT; i++) {
        const state = states.current[i];
        // Interpolated per frame rather than snapped, so focus and un-focus
        // ease identically and an interrupted transition continues from where
        // it was rather than jumping.
        const step = reduced ? 1 : (1000 / 60) / FOCUS_MS;
        state.focus += Math.sign(state.target - state.focus) *
          Math.min(step, Math.abs(state.target - state.focus));
        const f = ease(state.focus);

        // Entrance: bottom band first, each interpolated on the shared curve.
        const enterDelay = ENTER_DELAY_MS + (BAND_COUNT - 1 - i) * ENTER_STAGGER_MS;
        const enterRaw = reduced ? 1 : (elapsed - enterDelay) / ENTER_MS;
        const enter = ease(Math.min(Math.max(enterRaw, 0), 1));
        if (enter <= 0) continue;

        const anyFocus = focused.current !== null;
        const alpha = (anyFocus ? BLUR_ALPHA + (IDLE_ALPHA - BLUR_ALPHA) * f : IDLE_ALPHA) * enter;

        const drift = reduced
          ? 0
          : amplitude *
            Math.sin((elapsed / timing[i].period) * Math.PI * 2 + timing[i].phase);

        const top = i * (bandH + gap);
        const scaled = bandH * (1 + (FOCUS_SCALE - 1) * f);
        // Scale about the band's own centre, in draw height — a CSS transform
        // would blur the canvas rather than redraw it.
        const y = top + (bandH - scaled) / 2 + (1 - enter) * 24;

        const colours = seasons[i].palette.best;
        // Drawn 12px wider than the viewport and offset, so the drift never
        // opens a gap at either edge.
        const over = 12;
        const swatchW = (width + over * 2 - (colours.length - 1) * swatchGap) / colours.length;

        ctx.globalAlpha = alpha;
        for (let s = 0; s < colours.length; s++) {
          ctx.fillStyle = colours[s].hex;
          ctx.fillRect(
            -over + drift + s * (swatchW + swatchGap),
            y,
            swatchW,
            scaled
          );
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      frame = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    readMetrics();
    start = performance.now();
    startLoop();

    // Decoration has no business spending battery nobody is looking at.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()),
      { threshold: 0 }
    );
    observer.observe(wrap);

    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener("visibilitychange", onVisibility);

    const resize = new ResizeObserver(() => {
      readMetrics();
      draw(performance.now());
    });
    resize.observe(wrap);

    return () => {
      stopLoop();
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [seasons, timing]);

  /** Which band a y-coordinate inside the field belongs to. */
  const bandAt = useCallback((clientY: number): number | null => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const local = clientY - rect.top;
    if (local < 0 || local > rect.height) return null;
    const index = Math.floor((local / rect.height) * BAND_COUNT);
    return Math.min(Math.max(index, 0), BAND_COUNT - 1);
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const index = bandAt(e.clientY);
    setFocus(index, e.clientX - wrap.getBoundingClientRect().left);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const index = bandAt(e.clientY);
    if (index === null) return;
    // Touch focuses first and opens second, so the first tap is never blind.
    if (e.pointerType === "touch" && touchFocused.current !== index) {
      touchFocused.current = index;
      setFocus(index, e.clientX - (wrapRef.current?.getBoundingClientRect().left ?? 0));
      return;
    }
    setOpened(index);
  };

  useEffect(() => {
    if (opened === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpened(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opened]);

  const open = opened === null ? null : seasons[opened];
  const descriptor =
    open ? (getSeasonStyle(open.season)?.story.split(". ")[0] ?? "") + "." : "";

  return (
    <div
      className={`field${canvasOk ? " field--canvas" : ""}`}
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        setFocus(null);
        touchFocused.current = null;
      }}
      onPointerUp={onPointerUp}
    >
      <canvas className="field__canvas" ref={canvasRef} aria-hidden />

      {/* The keyboard and screen-reader surface, and the canvas fallback. */}
      <ul className="field__dom" role="list" aria-label={t("home.field.title")}>
        {seasons.map((entry, i) => (
          <li
            key={entry.season}
            role="listitem"
            tabIndex={0}
            className="field__band"
            aria-label={t("home.field.open", { season: entry.season })}
            onFocus={() => setFocus(i)}
            onBlur={() => setFocus(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpened(i);
                return;
              }
              const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
              if (!delta) return;
              e.preventDefault();
              const next = (i + delta + BAND_COUNT) % BAND_COUNT;
              (
                e.currentTarget.parentElement?.children[next] as HTMLElement | undefined
              )?.focus();
            }}
          >
            {entry.palette.best.map((colour) => (
              <span
                className="field__swatch"
                key={colour.hex}
                // Transparent while the canvas paints; the real colour only
                // when it is the fallback.
                style={{ background: canvasOk ? "transparent" : colour.hex }}
              />
            ))}
          </li>
        ))}
      </ul>

      <span className="field__label" ref={labelRef} data-on="false" aria-hidden />

      {open && (
        <>
          <div className="field__backdrop" onClick={() => setOpened(null)} />
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
            {descriptor && <p className="field__panel-note">{descriptor}</p>}
            <ul className="field__panel-swatches">
              {open.palette.best.map((colour) => (
                <li key={colour.hex}>
                  <span style={{ background: colour.hex }} />
                  <span className="field__panel-name">{colour.name}</span>
                  <span className="field__panel-hex ltr-run">
                    {colour.hex.replace("#", "").toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="cta cta--primary" onClick={() => navigate("/analyse")}>
              {t("home.field.cta")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
