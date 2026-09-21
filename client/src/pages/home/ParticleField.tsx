import { useEffect, useRef } from "react";
import { getCSSVar } from "../../theme";

const PARTICLE_COUNT = 50;
/** Backing-store scale cap: past 2x the extra pixels cost fill rate and show nothing. */
const MAX_DPR = 2;

interface Particle {
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
  driftX: number;
  driftPhase: number;
}

/** A hex token → "r, g, b", so the canvas draws in the token rather than a copy of it. */
function rgbChannels(hex: string): string {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.replace(/./g, "$&$&") : value, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * The one ambient effect on Home: fifty motes of the accent colour rising
 * slowly, behind everything.
 *
 * Fixed to the viewport rather than laid into the hero, so it is the same sky
 * at the foot of the page as at the top; the sections above it are overlays
 * thin enough to see through (home-landing.css holds them to that). Sized to
 * its own box, which is the viewport, and re-measured when a phone's address
 * bar comes and goes.
 *
 * The loop stops while the tab is hidden — nobody is watching, and a
 * background tab has better uses for a frame budget.
 *
 * Never mounted under reduced motion; that decision is the caller's, so a
 * reader who asked for stillness does not get a canvas at all.
 */
export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // No token, no field: a guessed gold here would be a second copy of the accent.
    const accent = getCSSVar("--accent");
    if (!accent) return;
    const colour = rgbChannels(accent);
    let width = 0;
    let height = 0;
    let frame = 0;
    let particles: Particle[] = [];

    const seed = () => {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.25,
        size: 1 + Math.random() * 1.5,
        driftX: (Math.random() - 0.5) * 0.3,
        driftPhase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const first = width === 0;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first) seed();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.y -= p.speed;
        p.x += Math.sin(p.driftPhase) * p.driftX;
        p.driftPhase += 0.005;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colour}, ${p.opacity})`;
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };

    const sync = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };

    resize();
    sync();

    const sizes = new ResizeObserver(resize);
    sizes.observe(canvas);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-particles" aria-hidden="true" />;
}
