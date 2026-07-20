import { useEffect, useRef } from "react";

interface StarFieldProps {
  /** Max opacity of individual stars (0–1). Default 0.92 (Home page). Use 0.45 for inner pages. */
  maxOpacity?: number;
  /** Min animation duration in seconds. Default 2.5 */
  minDuration?: number;
  /** Max extra duration in seconds added to min. Default 4 */
  durationRange?: number;
}

interface Star {
  x: number; // 0-1 viewport fraction
  y: number;
  r: number;
  duration: number;
  delay: number;
}

const STAR_COUNT = 140;
const MIN_OPACITY = 0.05;

/**
 * Twinkling star background. One canvas + one rAF loop instead of the
 * previous 220 individually-animated SVG circles. Static under
 * prefers-reduced-motion; paused while the tab is hidden.
 */
export default function StarField({
  maxOpacity = 0.92,
  minDuration = 2.5,
  durationRange = 4,
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() * 96 + 2) / 100,
      y: (Math.random() * 96 + 2) / 100,
      r: Math.random() * 1.1 + 0.3,
      duration: (Math.random() * durationRange + minDuration) * 1000,
      delay: Math.random() * 9000,
    }));

    const fill = getComputedStyle(document.documentElement)
      .getPropertyValue("--text-primary")
      .trim() || "#F2EEE8";

    let raf = 0;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = (now: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = fill;
      for (const s of stars) {
        // Same curve as the old CSS `twinkle` keyframes: 0.05 → max → 0.05
        const phase = ((now + s.delay) % s.duration) / s.duration;
        const t = Math.sin(phase * Math.PI); // 0→1→0, ease-in-out-ish
        ctx.globalAlpha = MIN_OPACITY + (maxOpacity - MIN_OPACITY) * t;
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      // Static field at a gentle fixed opacity — no animation loop
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.fillStyle = fill;
      ctx.globalAlpha = Math.min(0.5, maxOpacity);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      if (reducedMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [maxOpacity, minDuration, durationRange]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
