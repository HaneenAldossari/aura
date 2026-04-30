import { useEffect, useState } from "react";

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

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#4CAF50";
  if (score >= 65) return "#D4AF7A";
  if (score >= 40) return "#E8A838";
  return "#E05555";
}

function getVerdictLabel(verdict: string): string {
  const map: Record<string, string> = {
    great: "Perfect Match",
    good: "Good Match",
    maybe: "Might Work",
    avoid: "Not Your Color",
  };
  return map[verdict] ?? verdict;
}

function getVerdictEmoji(verdict: string): string {
  const map: Record<string, string> = {
    great: "✦",
    good: "✓",
    maybe: "◑",
    avoid: "✕",
  };
  return map[verdict] ?? "?";
}

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCurrent(target);
        clearInterval(timer);
      } else {
        setCurrent(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{current}</>;
}

export function LinkCheckResult({ result, onReset }: LinkCheckResultProps) {
  const [mounted, setMounted] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const scoreColor = getScoreColor(result.matchScore);
  const textOnProduct = isLight(result.hex) ? "#0D0D0F" : "#FFFFFF";

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
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      {/* ── PRODUCT COLOR HEADER ── */}
      <div
        style={{
          background: result.hex,
          padding: "24px 24px 20px",
        }}
      >
        <p style={{
          fontSize: "11px",
          color: isLight(result.hex) ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.55)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: "0 0 6px 0",
        }}>
          {result.productName}
        </p>
        <p style={{
          fontSize: "26px",
          fontWeight: 700,
          color: textOnProduct,
          margin: 0,
          textTransform: "capitalize",
          letterSpacing: "-0.02em",
        }}>
          {result.productColor}
        </p>
      </div>

      {/* ── MATCH SCORE TAPE ── */}
      <div style={{ padding: "20px 24px 0" }}>

        {/* Score header row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "10px",
        }}>
          {/* Big animated score number */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{
              fontSize: "52px",
              fontWeight: 800,
              color: scoreColor,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.03em",
            }}>
              {mounted ? <CountUp target={result.matchScore} /> : 0}
            </span>
            <span style={{
              fontSize: "20px",
              fontWeight: 600,
              color: scoreColor,
              opacity: 0.7,
            }}>
              %
            </span>
          </div>

          {/* Verdict badge */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: `${scoreColor}18`,
            border: `1px solid ${scoreColor}40`,
            borderRadius: "20px",
            padding: "6px 14px",
          }}>
            <span style={{ color: scoreColor, fontSize: "13px" }}>
              {getVerdictEmoji(result.verdict)}
            </span>
            <span style={{
              color: scoreColor,
              fontSize: "13px",
              fontWeight: 600,
            }}>
              {getVerdictLabel(result.verdict)}
            </span>
          </div>
        </div>

        {/* Animated tape gauge */}
        <div style={{
          position: "relative",
          height: "12px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "6px",
          overflow: "hidden",
          marginBottom: "6px",
        }}>
          {/* Segmented tick marks */}
          {[25, 50, 75].map(pct => (
            <div key={pct} style={{
              position: "absolute",
              left: `${pct}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              background: "rgba(255,255,255,0.12)",
              zIndex: 2,
            }} />
          ))}
          {/* Animated fill */}
          <div style={{
            height: "100%",
            width: mounted ? `${result.matchScore}%` : "0%",
            background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
            borderRadius: "6px",
            transition: "width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            position: "relative",
          }}>
            {/* Shimmer effect */}
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
              animation: mounted ? "shimmer 2s ease 1.2s 1" : "none",
            }} />
          </div>
        </div>

        {/* Scale labels */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}>
          {["Avoid", "Maybe", "Good", "Perfect"].map((label, i) => (
            <span key={label} style={{
              fontSize: "9px",
              color: i * 25 + 12 <= result.matchScore
                ? scoreColor
                : "rgba(255,255,255,0.2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 500,
              transition: "color 1.2s ease",
            }}>
              {label}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border-color)", margin: "0 -24px 20px" }} />

        {/* ── REASON ── */}
        <p style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: 1.75,
          margin: "0 0 16px 0",
        }}>
          {result.reason}
        </p>

        {/* ── TIP BOX ── */}
        {result.tip && (
          <div style={{
            background: "rgba(212,175,122,0.07)",
            border: "1px solid rgba(212,175,122,0.18)",
            borderLeft: "3px solid var(--accent-gold)",
            borderRadius: "0 12px 12px 0",
            padding: "12px 16px",
            marginBottom: "24px",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "14px", flexShrink: 0 }}>💡</span>
            <p style={{
              fontSize: "13px",
              color: "var(--accent-gold-light)",
              margin: 0,
              lineHeight: 1.65,
            }}>
              {result.tip}
            </p>
          </div>
        )}

        {/* ── SIMILAR COLORS ── */}
        {result.similarColors?.length > 0 && (
          <>
            <p style={{
              fontSize: "10px",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: "0 0 12px 0",
            }}>
              Similar in Your Palette
            </p>
            <div style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "24px",
            }}>
              {result.similarColors.map((c) => (
                <div
                  key={c.name}
                  onMouseEnter={() => setHoveredColor(c.name)}
                  onMouseLeave={() => setHoveredColor(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: hoveredColor === c.name
                      ? `${c.hex}22`
                      : "var(--bg-card)",
                    border: `1px solid ${hoveredColor === c.name ? c.hex + "55" : "var(--border-color)"}`,
                    borderRadius: "24px",
                    padding: "8px 14px 8px 8px",
                    cursor: "default",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: c.hex,
                    boxShadow: hoveredColor === c.name
                      ? `0 0 12px ${c.hex}88`
                      : `0 0 6px ${c.hex}44`,
                    transition: "box-shadow 0.2s ease",
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "12px",
                    color: hoveredColor === c.name ? "var(--text-primary)" : "var(--text-secondary)",
                    transition: "color 0.2s ease",
                  }}>
                    {c.name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── RESET BUTTON ── */}
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
            marginBottom: "4px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(212,175,122,0.08)";
            e.currentTarget.style.borderColor = "#D4AF7A55";
            e.currentTarget.style.color = "var(--accent-gold-light)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border-color)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          Check Another Item
        </button>
      </div>

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
