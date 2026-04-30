import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

// ─── PALETTE — Charcoal + Champagne ───
const ESPRESSO = "#0D0D0F";
const GOLD = "#D4AF7A";
const TERRACOTTA = "#A8895A";
const BURGUNDY = "#1C1C22";

const PARTICLE_COLORS = [GOLD, "#EAD09A", "#D4AF7A", "#A8895A", "#B8B0A4"];

// ─── SEEDED RANDOM ───
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── PARTICLE CONFIG ───
interface Particle {
  x: number;       // 0-1 horizontal position
  baseY: number;   // starting Y (bottom area)
  size: number;    // radius in px
  speed: number;   // upward speed factor
  drift: number;   // horizontal sway amplitude
  driftSpeed: number;
  opacity: number;
  color: string;
  blur: number;
}

function generateParticles(count: number): Particle[] {
  const rng = seeded(42);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: rng(),
      baseY: 0.7 + rng() * 0.5,  // start from lower portion + below screen
      size: 2 + rng() * 6,
      speed: 0.015 + rng() * 0.025,
      drift: 10 + rng() * 30,
      driftSpeed: 0.3 + rng() * 0.7,
      opacity: 0.15 + rng() * 0.45,
      color: PARTICLE_COLORS[Math.floor(rng() * PARTICLE_COLORS.length)],
      blur: rng() > 0.6 ? 1 + rng() * 3 : 0,
    });
  }
  return particles;
}

const PARTICLES = generateParticles(80);

// ─── GRADIENT WAVE ───
interface WaveConfig {
  yOffset: number;
  amplitude: number;
  frequency: number;
  speed: number;
  color1: string;
  color2: string;
  opacity: number;
}

const WAVES: WaveConfig[] = [
  { yOffset: 0.65, amplitude: 60, frequency: 1.2, speed: 0.4, color1: BURGUNDY, color2: "transparent", opacity: 0.18 },
  { yOffset: 0.72, amplitude: 45, frequency: 0.8, speed: 0.25, color1: TERRACOTTA, color2: "transparent", opacity: 0.12 },
  { yOffset: 0.8, amplitude: 35, frequency: 1.5, speed: 0.55, color1: GOLD, color2: "transparent", opacity: 0.1 },
];

function WaveLayer({
  wave,
  progress,
  width,
  height,
}: {
  wave: WaveConfig;
  progress: number; // 0-1 loop progress
  width: number;
  height: number;
}) {
  // Build SVG path for a smooth wave
  const points = 200;
  const phaseShift = progress * Math.PI * 2 * wave.speed;
  let d = `M 0 ${height}`;

  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const baseY = wave.yOffset * height;
    const y =
      baseY +
      Math.sin((i / points) * Math.PI * 2 * wave.frequency + phaseShift) *
        wave.amplitude +
      Math.sin((i / points) * Math.PI * 2 * wave.frequency * 0.5 + phaseShift * 1.3) *
        wave.amplitude * 0.4;
    d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L ${width} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, opacity: wave.opacity }}
    >
      <defs>
        <linearGradient id={`wg-${wave.yOffset}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={wave.color1} stopOpacity={1} />
          <stop offset="100%" stopColor={wave.color1} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#wg-${wave.yOffset})`} />
    </svg>
  );
}

// ─── MAIN COMPOSITION ───
export const HeroBg: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Seamless loop progress 0→1
  const progress = frame / durationInFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: ESPRESSO }}>

      {/* Radial ambient glow */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse 80% 60% at 30% 40%, ${BURGUNDY}22 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 75% 55%, ${TERRACOTTA}18 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 50% 30%, ${GOLD}15 0%, transparent 60%)
          `,
        }}
      />

      {/* Moving ambient glow — shifts with time */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          left: "-10%",
          top: "-10%",
          background: `
            radial-gradient(ellipse 40% 35% at ${50 + Math.sin(progress * Math.PI * 2) * 15}% ${45 + Math.cos(progress * Math.PI * 2) * 10}%, ${GOLD}20 0%, transparent 70%)
          `,
          transition: "none",
        }}
      />

      {/* Gradient waves */}
      {WAVES.map((wave, i) => (
        <WaveLayer key={i} wave={wave} progress={progress} width={width} height={height} />
      ))}

      {/* Particles */}
      {PARTICLES.map((p, i) => {
        // Seamless vertical loop: particle travels up, wraps around
        const totalTravel = 1 + p.baseY; // full distance from bottom to above screen
        const rawY = p.baseY - progress * totalTravel * (p.speed / 0.02);
        // Wrap around seamlessly
        const y = ((rawY % totalTravel) + totalTravel) % totalTravel - 0.15;

        // Horizontal sway
        const x = p.x + Math.sin(progress * Math.PI * 2 * p.driftSpeed + i) * (p.drift / width);

        // Fade in/out at edges
        const fadeOpacity = interpolate(
          y,
          [-0.05, 0.05, 0.85, 1.0],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: p.color,
              opacity: p.opacity * fadeOpacity,
              filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}66`,
              willChange: "transform",
            }}
          />
        );
      })}

      {/* Subtle vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 70% 65% at 50% 50%, transparent 40%, ${ESPRESSO} 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
