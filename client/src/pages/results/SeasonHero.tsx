import { useEffect, useState } from "react";
import FanDeck from "./FanDeck";
import type { AnalysisResult } from "../../lib/types";
import { useT } from "../../i18n";

/**
 * Overview identity block: season name + tagline on the left, the palette
 * fan on the right.
 *
 * The season name gets the one entrance in the app: a single 8px fade-up, the
 * whole name at once. The old version staggered it word by word and ran a gold
 * shimmer across it — the design system bans shimmer by name, and the stagger
 * turned the answer the user waited for into a title sequence.
 *
 * It plays once per analysis, not once per mount, so navigating back to
 * Results does not replay it. prefers-reduced-motion collapses it to the
 * resting state via the global rule in index.css.
 */
/**
 * True the first time this analysis renders the hero, false afterwards.
 *
 * Read and written in the same call so React 18 strict-mode double-invocation
 * cannot hand the entrance out twice. Without a session id there is nothing to
 * key on, so it simply plays.
 */
function claimEntrance(sessionId?: string): boolean {
  if (!sessionId || typeof sessionStorage === "undefined") return true;
  const key = `aura:hero-seen:${sessionId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    // Private mode or blocked storage — replaying is the harmless failure.
    return true;
  }
}

export default function SeasonHero({
  data,
  seasonName,
  sessionId,
}: {
  data: AnalysisResult;
  seasonName: string;
  sessionId?: string;
}) {
  const t = useT();
  const seasonWords = seasonName.split(" ");
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 900
  );
  const [playEntrance] = useState(() => claimEntrance(sessionId));

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const colors = (data.palette?.best || [])
    .filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i)
    .slice(0, 12);

  const traits = [
    data.undertone,
    data.chroma,
    data.contrastLevel && t("results.hero.contrastSuffix", { level: data.contrastLevel }),
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
          }}>
            {t("results.hero.eyebrow")}
          </p>
          <h1 className={playEntrance ? "hero-name-enter" : undefined} style={{
            fontFamily: "Cormorant Garamond, serif",
            fontWeight: 300,
            fontSize: "clamp(40px, 5.5vw, 72px)",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "#F2EEE8",
            margin: "0 0 18px 0",
            position: "relative",
          }}>
            {seasonWords.map((word, i) => (
              <span
                key={i}
                style={{
                  marginInlineEnd: i < seasonWords.length - 1 ? "0.25em" : 0,
                  color: i === 0 ? "#F2EEE8" : "#D4AF7A",
                  fontStyle: i === 0 ? "normal" : "italic",
                }}
              >
                {word}
              </span>
            ))}
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
              borderInlineStart: "2px solid rgba(212,175,122,0.3)",
              paddingInlineStart: 20,
              paddingTop: 4,
              paddingBottom: 4,
              margin: 0,
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
            {t("results.hero.paletteCaption")}
          </p>
          <FanDeck colors={colors} size={isNarrow ? "medium" : "medium"} />
        </div>
      </div>
    </section>
  );
}
