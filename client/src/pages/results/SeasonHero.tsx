import { useEffect, useState } from "react";
import FanDeck from "./FanDeck";
import type { AnalysisResult } from "../../lib/types";

/**
 * Overview identity block: season name + tagline on the left, the palette
 * fan on the right — one unified reveal for demo and live analyses alike.
 * First visit plays a word-by-word rise + gold shimmer; repeats are static.
 */
export default function SeasonHero({
  data,
  seasonName,
  sessionId,
}: {
  data: AnalysisResult;
  seasonName: string;
  sessionId?: string;
}) {
  const seasonWords = seasonName.split(" ");
  const [reveal, setReveal] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 900
  );

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `aura-revealed-${sessionId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setReveal(true);
    }
  }, [sessionId]);

  const colors = (data.palette?.best || [])
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
    .slice(0, 12);

  const traits = [
    data.undertone,
    data.chroma,
    data.contrastLevel && `${data.contrastLevel} contrast`,
  ].filter(Boolean) as string[];

  return (
    <section style={{ position: "relative", marginBottom: 64 }}>
      <div style={{
        position: "absolute",
        top: -80,
        left: -80,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,175,122,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "minmax(300px, 1fr) minmax(420px, 1.2fr)",
          gap: isNarrow ? 36 : 48,
          alignItems: "center",
        }}
      >
        {/* Left: identity */}
        <div>
          <p style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 18,
            color: "#D4AF7A",
            letterSpacing: "0.05em",
            marginBottom: 10,
            opacity: 0.8,
            animation: reveal ? "fadeIn 1s ease-out both" : undefined,
          }}>
            Your revelation is complete.
          </p>
          <h1 style={{
            fontFamily: "Cormorant Garamond, serif",
            fontWeight: 300,
            fontSize: "clamp(40px, 5.5vw, 72px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "#F2EEE8",
            margin: "0 0 18px 0",
            position: "relative",
            overflow: reveal ? "hidden" : undefined,
          }}>
            {seasonWords.map((word, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: i < seasonWords.length - 1 ? "0.25em" : 0,
                  color: i === 0 ? "#F2EEE8" : "#D4AF7A",
                  fontStyle: i === 0 ? "normal" : "italic",
                  animation: reveal
                    ? `slideUp 0.8s cubic-bezier(0.22,1,0.36,1) ${0.15 + i * 0.18}s both`
                    : undefined,
                }}
              >
                {word}
              </span>
            ))}
            {reveal && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(105deg, transparent 30%, rgba(212,175,122,0.25) 50%, transparent 70%)",
                  transform: "translateX(-100%)",
                  animation: "hero-shimmer 1.4s ease-out 0.9s forwards",
                  pointerEvents: "none",
                }}
              />
            )}
          </h1>

          {/* trait line — undertone · chroma · contrast */}
          {traits.length > 0 && (
            <p style={{
              fontFamily: "Inter, sans-serif",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              margin: "0 0 20px 0",
              animation: reveal ? "fadeIn 0.9s ease-out 0.7s both" : undefined,
            }}>
              {traits.join("  ·  ")}
            </p>
          )}

          {data.seasonTagline && (
            <p style={{
              fontFamily: "Cormorant Garamond, serif",
              fontStyle: "italic",
              fontSize: 19,
              color: "#B8B0A4",
              maxWidth: 440,
              lineHeight: 1.55,
              borderLeft: "2px solid rgba(212,175,122,0.3)",
              paddingLeft: 20,
              paddingTop: 4,
              paddingBottom: 4,
              margin: 0,
              animation: reveal ? "fadeIn 0.9s ease-out 0.9s both" : undefined,
            }}>
              &ldquo;{data.seasonTagline}&rdquo;
            </p>
          )}
        </div>

        {/* Right: the palette fan */}
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            textAlign: "center",
            margin: "0 0 4px",
          }}>
            Your 12 signature tones
          </p>
          <FanDeck colors={colors} size={isNarrow ? "medium" : "medium"} />
        </div>
      </div>
    </section>
  );
}
