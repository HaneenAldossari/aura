import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { BeautyShade } from "../../data/seasonBeautyGuide";
import "./results-tabs.css";

export type ShadeShape = "dab" | "drop" | "almond";

/** Organic border radii per shape (almond is a tall nail-like ellipse). */
const RADII: Record<ShadeShape, string> = {
  dab: "46% 54% 52% 48% / 55% 45% 55% 45%",
  drop: "50% 50% 50% 50% / 60% 60% 40% 40%",
  almond: "50% 50% 45% 45%",
};

/**
 * ShadeDab — an artistic CSS "makeup smear" that replaces photo swatches.
 * A rounded organic blob filled with the shade hex, layered with a gloss
 * highlight, bottom-edge depth shadow, and a finish-specific veil
 * (shimmer sparkle / gloss streak / matte ring). Click copies the hex.
 */
export default function ShadeDab({
  shade,
  size = 64,
  shape = "dab",
  avoid = false,
}: {
  shade: BeautyShade;
  size?: number;
  shape?: ShadeShape;
  avoid?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const finish = shade.finish;
  const width =
    shape === "almond" ? Math.round(size * 0.5) : shape === "drop" ? Math.round(size * 0.84) : size;
  const height = size;
  // The drop is the given radius rotated into a hanging teardrop; overlays are
  // placed pre-rotation so the highlight still reads top-left, depth bottom.
  const rotated = shape === "drop";
  const highlightPos = rotated ? "70% 78%" : "30% 25%";
  const depthShadow = rotated
    ? "inset 0 5px 9px rgba(0,0,0,0.25)"
    : "inset 0 -5px 9px rgba(0,0,0,0.25)";
  const matteRing = finish === "matte" ? ", inset 0 0 0 1.5px rgba(255,255,255,0.07)" : "";

  const copyHex = () => {
    navigator.clipboard?.writeText(shade.hex).catch(() => {});
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1300);
  };

  const blob: CSSProperties = {
    display: "block", // spans ignore width/height when inline
    width,
    height,
    borderRadius: RADII[shape],
    background: shade.hex,
    boxShadow: `${depthShadow}${matteRing}`,
    position: "relative",
    overflow: "hidden",
    transform: rotated ? "rotate(184deg)" : undefined,
  };

  const overlay = (style: CSSProperties, key: string) => (
    <span
      key={key}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", ...style }}
    />
  );

  const layers = [];
  if (finish !== "matte") {
    // Radial gloss highlight (all non-matte finishes)
    layers.push(
      overlay(
        { background: `radial-gradient(circle at ${highlightPos}, rgba(255,255,255,0.35), transparent 55%)` },
        "highlight",
      ),
    );
  }
  if (finish === "shimmer") {
    // Fine sparkle veil — tiny dotted radial gradient at low opacity
    layers.push(
      overlay(
        {
          backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 0.6px, transparent 1.3px)",
          backgroundSize: "5px 5px",
          opacity: 0.22,
        },
        "sparkle",
      ),
    );
  }
  if (finish === "gloss") {
    // Stronger sharp highlight streak
    layers.push(
      overlay(
        {
          background: `radial-gradient(circle at ${highlightPos}, rgba(255,255,255,0.55), transparent 34%), linear-gradient(115deg, transparent 34%, rgba(255,255,255,0.4) 41%, transparent 48%)`,
        },
        "streak",
      ),
    );
  }
  if (shape === "almond") {
    // Pale base "cuticle" arc at the nail base
    layers.push(
      overlay(
        {
          inset: "auto 20% 5%",
          height: "20%",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.26)",
          filter: "blur(1px)",
        },
        "cuticle",
      ),
    );
  }

  return (
    <button
      type="button"
      className={`shade-dab${avoid ? " shade-dab--avoid" : ""}`}
      onClick={copyHex}
      aria-label={`${shade.name}${finish ? `, ${finish} finish` : ""}${avoid ? ", not recommended" : ""} — copy hex ${shade.hex}`}
      title={`Copy ${shade.hex}`}
    >
      <span className="shade-dab__blob-wrap" style={{ display: "block", width, height }}>
        <span className="shade-dab__hexchip" role="status">
          {copied ? "Copied" : shade.hex}
        </span>
        <span className="shade-dab__ring" style={{ borderRadius: RADII[shape] }} />
        <span style={blob}>{layers}</span>
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          maxWidth: Math.max(width + 28, 76),
        }}
      >
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            color: "var(--text-primary)",
            textAlign: "center",
            lineHeight: 1.25,
          }}
        >
          {shade.name}
        </span>
        {finish && (
          <span
            style={{
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--text-muted)",
            }}
          >
            {finish}
          </span>
        )}
      </span>
    </button>
  );
}
