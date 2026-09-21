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

/** "#C9A567" → "201, 165, 103", so the canvas draws in the token rather than a copy of it. */
function rgbChannels(hex: string): string {
  const value = hex.replace("#", "");
  const n = parseInt(value.length === 3 ? value.replace(/./g, "$&$&") : value, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * The one ambient effect on Home: fifty motes of the accent colour rising
 * slowly through the hero.
 *
 * Sized to the hero rather than the window, because on a phone the hero is
 * taller than the screen and a window-sized canvas stops short of its bottom
 * edge. The loop only runs while the hero is on screen and the tab is visible —
 * nobody is watching it otherwise, and it would hold a frame budget for the
 * marquee below.
 *
 * Never mounted under reduced motion; that decision is the caller's, so a
 * reader who asked for stillness does not get a canvas at all.
 */
export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const colour = rgbChannels(getCSSVar("--accent") || "#C9A567");
    let width = 0;
    let height = 0;
    let frame = 0;
    let onScreen = true;
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
      width = host.clientWidth;
      height = host.clientHeight;
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
      if (onScreen && !document.hidden) frame = requestAnimationFrame(draw);
    };

    resize();
    sync();

    const sizes = new ResizeObserver(resize);
    sizes.observe(host);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    visibility.observe(host);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(frame);
      sizes.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-particles" aria-hidden="true" />;
}
