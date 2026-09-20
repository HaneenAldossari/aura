import { useEffect, useMemo, useState } from "react";
import "../pages/results/results-tabs.css";
import { useT, type Key } from "../i18n";

interface SimilarColor {
  name: string;
  hex: string;
}

interface LinkCheckData {
  productName: string;
  productColor: string;
  hex: string;
  matchScore: number;
  verdict: "great" | "good" | "maybe" | "avoid";
  reason: string;
  tip: string;
  similarColors: SimilarColor[];
}

interface LinkCheckResultProps {
  result: LinkCheckData;
  onReset: () => void;
}

/** Verdict → color (solid uses the CSS var; soft washes use color-mix). */
const VERDICT_COLORS: Record<LinkCheckData["verdict"], string> = {
  great: "var(--color-success)",
  good: "var(--accent-gold)",
  maybe: "var(--color-warning)",
  avoid: "var(--color-error)",
};

const VERDICT_LABELS: Record<string, Key> = {
  great: "results.shop.verdictGreat",
  good: "results.shop.verdictGood",
  maybe: "results.shop.verdictMaybe",
  avoid: "results.shop.verdictAvoid",
};

// Semicircular gauge geometry: 180° arc of radius 80 in a 200×112 viewBox
const ARC_R = 80;
const ARC_PATH = `M 20 102 A ${ARC_R} ${ARC_R} 0 0 1 180 102`;
const ARC_LEN = Math.PI * ARC_R;

export function LinkCheckResult({ result, onReset }: LinkCheckResultProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const t = useT();
  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const verdictColor = VERDICT_COLORS[result.verdict] ?? "var(--accent-gold)";
  // An unrecognised verdict falls through as its own raw value rather than a
  // key — the server's enum should make that unreachable, but a new verdict
  // slipping through should read as itself, not as a missing-string warning.
  const verdictKey = VERDICT_LABELS[result.verdict];
  const verdictLabel = verdictKey ? t(verdictKey) : result.verdict;
  const score = Math.max(0, Math.min(100, result.matchScore));
  const shown = mounted || prefersReduced;
  const dashOffset = shown ? ARC_LEN * (1 - score / 100) : ARC_LEN;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        overflow: "hidden",
        marginTop: "16px",
        padding: "28px 24px 24px",
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(16px)",
        transition: prefersReduced ? undefined : "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* ── Verdict: product chip on the left, semicircular gauge center ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "28px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        {/* Product color chip */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", minWidth: 96 }}>
          <div
            title={result.hex}
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: result.hex,
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25), inset 0 -1px 3px rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.35)",
              flexShrink: 0,
            }}
          />
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                fontSize: "9px",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                margin: "0 0 3px",
              }}
            >
              {result.productName}
            </p>
            <p
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "18px",
                color: "var(--text-primary)",
                margin: 0,
                textTransform: "capitalize",
                lineHeight: 1.15,
              }}
            >
              {result.productColor}
            </p>
          </div>
        </div>

        {/* Semicircular gauge */}
        <div
          role="img"
          aria-label={`Match score ${score} out of 100 — ${verdictLabel}`}
          style={{ position: "relative", width: 220, maxWidth: "100%" }}
        >
          <svg width="100%" viewBox="0 0 200 112" style={{ display: "block", overflow: "visible" }}>
            <path
              d={ARC_PATH}
              fill="none"
              stroke="var(--border-color)"
              strokeWidth={10}
              strokeLinecap="round"
            />
            <path
              className="gauge-arc"
              d={ARC_PATH}
              fill="none"
              stroke={verdictColor}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              strokeDashoffset={dashOffset}
              style={{
                transition: prefersReduced ? undefined : "stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s",
                filter: `drop-shadow(0 0 6px color-mix(in srgb, ${verdictColor} 45%, transparent))`,
              }}
            />
          </svg>
          {/* Score + verdict in the arc's center */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "46px",
                fontWeight: 600,
                lineHeight: 0.9,
                color: verdictColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {score}
              <span style={{ fontSize: "20px", opacity: 0.7 }}>%</span>
            </div>
            <p
              style={{
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: verdictColor,
                margin: "6px 0 0",
              }}
            >
              {verdictLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border-color)", margin: "20px -24px 20px" }} />

      {/* ── Reason ── */}
      <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 16px" }}>
        {result.reason}
      </p>

      {/* ── Tip ── */}
      {result.tip && (
        <div
          style={{
            background: "color-mix(in srgb, var(--accent-gold) 7%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent-gold) 18%, transparent)",
            borderInlineStart: "3px solid var(--accent-gold)",
            borderRadius: "0 12px 12px 0",
            padding: "12px 16px",
            marginBottom: "24px",
          }}
        >
          <p style={{ fontSize: "13px", color: "var(--accent-gold-light)", margin: 0, lineHeight: 1.65 }}>
            {result.tip}
          </p>
        </div>
      )}

      {/* ── Closest tones from your palette ── */}
      {result.similarColors?.length > 0 && (
        <>
          <p
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 14px",
            }}
          >
            {t("results.shop.closestTones")}
          </p>
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginBottom: "24px" }}>
            {result.similarColors.map((c) => (
              <div
                key={c.name}
                title={c.name}
                onMouseEnter={() => setHoveredColor(c.name)}
                onMouseLeave={() => setHoveredColor(null)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  maxWidth: 72,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: c.hex,
                    boxShadow:
                      hoveredColor === c.name
                        ? `0 0 12px ${c.hex}88, inset 0 -2px 5px rgba(0,0,0,0.25)`
                        : `0 0 5px ${c.hex}44, inset 0 -2px 5px rgba(0,0,0,0.25)`,
                    transition: "box-shadow 0.2s ease",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.08em",
                    color: hoveredColor === c.name ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "color 0.2s ease",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.hex}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.25 }}>
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Reset ── */}
      <button
        onClick={onReset}
        style={{
          width: "100%",
          padding: "13px",
          background: "transparent",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          color: "var(--text-secondary)",
          fontSize: "14px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "color-mix(in srgb, var(--accent-gold) 8%, transparent)";
          e.currentTarget.style.borderColor = "color-mix(in srgb, var(--accent-gold) 33%, transparent)";
          e.currentTarget.style.color = "var(--accent-gold-light)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        {t("results.shop.checkAnother")}
      </button>
    </div>
  );
}
