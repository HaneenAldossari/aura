import { useEffect, useMemo, useState } from "react";
import { getDescriptors } from "./seasonDescriptors";
import { getSeasonBeautyGuide } from "../../data/seasonBeautyGuide";
import "./results-tabs.css";

/** Resolved DNA values (AI-returned, with neutral fallbacks). */
export type ColorDNAValues = {
  temperature: number;
  depth: number;
  clarity: number;
  contrast: number;
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Color Analysis card: feature descriptors on top, then four full-width axis
 * instruments — each a gradient of the actual axis with a gold-bordered
 * diamond marker that glides from center to its value on mount.
 */
export default function ColorDNAPanel({
  seasonName,
  colorDNA,
}: {
  seasonName: string;
  colorDNA: ColorDNAValues;
}) {
  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [settled, setSettled] = useState(prefersReduced);
  useEffect(() => {
    if (prefersReduced) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)));
    return () => cancelAnimationFrame(id);
  }, [prefersReduced]);

  const markerFill = getSeasonBeautyGuide(seasonName).blush[0]?.hex ?? "var(--accent-gold)";

  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const axes = [
    { low: "Cool", high: "Warm", from: "#7A8FA6", to: "#C4934A", value: clamp(colorDNA.temperature) },
    { low: "Light", high: "Deep", from: "#F0E8D8", to: "#2A1E16", value: clamp(colorDNA.depth) },
    { low: "Muted", high: "Clear", from: "#8A8578", to: "#D4AF7A", value: clamp(colorDNA.clarity) },
    { low: "Blends", high: "Contrasts", from: "#BCB4A6", to: "#15151B", value: clamp(colorDNA.contrast) },
  ];

  const desc = getDescriptors(seasonName);
  const featureRows = [
    { label: "Skin Undertone", value: desc.undertone },
    { label: "Hair", value: desc.hair },
    { label: "Eyes", value: desc.eyes },
    { label: "Contrast", value: desc.contrast },
  ].filter((r) => r.value);

  return (
    <section style={{ marginBottom: 80 }}>
      {/* ── Your Colour Analysis — descriptors ── */}
      <div style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 26,
            color: "var(--text-primary)",
            margin: "0 0 6px",
            lineHeight: 1.15,
          }}
        >
          Your Colour Analysis
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 20px", maxWidth: 620 }}>
          Our AI analysis has mapped your physical traits to the frequency of {seasonName}. Your features
          possess a {colorDNA.depth > 60 ? "grounded, majestic depth" : "soft, luminous quality"}.
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {featureRows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: i < featureRows.length - 1 ? "1px solid rgba(78,70,57,0.15)" : "none",
                gap: 16,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.18em",
                  color: "var(--accent-gold)",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: 16,
                  color: "var(--text-primary)",
                  textAlign: "right",
                  lineHeight: 1.3,
                }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Four full-width axis instruments ── */}
      <div
        style={{
          background: "rgba(32,31,31,0.8)",
          border: "1px solid var(--border-color)",
          padding: "36px 32px 30px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,122,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <h3
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 22,
            color: "var(--text-primary)",
            textAlign: "center",
            margin: "0 0 12px",
          }}
        >
          Color DNA Analysis
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 34, position: "relative", zIndex: 1 }}>
          {axes.map(({ low, high, from, to, value }, i) => {
            const left = settled ? value : 50;
            const transition = prefersReduced ? undefined : `left 0.8s ${EASE} ${i * 120}ms`;
            return (
              <div
                key={high}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(value)}
                aria-label={`${low} to ${high}`}
              >
                {/* End labels */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "Cormorant Garamond, serif",
                    fontStyle: "italic",
                    fontSize: 16,
                    color: "var(--text-secondary)",
                    marginBottom: 26,
                  }}
                >
                  <span>{low}</span>
                  <span>{high}</span>
                </div>
                {/* Gradient track of the actual axis */}
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${from}, ${to})`,
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  {/* Marker assembly: hairline + diamond + value chip, animated from center */}
                  <div
                    aria-hidden="true"
                    style={{ position: "absolute", left: `${left}%`, top: "50%", width: 0, height: 0, transition }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: -0.5,
                        top: -14,
                        width: 1,
                        height: 28,
                        background: "rgba(212,175,122,0.45)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: -5.5,
                        top: -5.5,
                        width: 11,
                        height: 11,
                        transform: "rotate(45deg)",
                        background: markerFill,
                        border: "1px solid var(--accent-gold)",
                        boxShadow: "0 0 8px rgba(212,175,122,0.5)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: 15,
                        left: 0,
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "0.06em",
                        padding: "1px 7px",
                        borderRadius: 7,
                        background: "var(--bg-card-subtle)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-secondary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Math.round(value)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
