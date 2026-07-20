import { useEffect, useState } from "react";

/** Overview hero: season name display + tagline. On the first visit to a
 * session, the heading rises word-by-word and a gold shimmer sweeps across —
 * the "reveal moment". Repeat visits render statically. */
export default function SeasonHero({
  seasonName,
  seasonTagline,
  sessionId,
}: {
  seasonName: string;
  seasonTagline?: string;
  sessionId?: string;
}) {
  const seasonWords = seasonName.split(" ");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `aura-revealed-${sessionId}`;
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      setReveal(true);
    }
  }, [sessionId]);

  return (
    <section style={{ position: "relative", marginBottom: 80 }}>
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
      <p style={{
        fontFamily: "Cormorant Garamond, serif",
        fontStyle: "italic",
        fontSize: 20,
        color: "#D4AF7A",
        letterSpacing: "0.05em",
        marginBottom: 12,
        opacity: 0.8,
        animation: reveal ? "fadeIn 1s ease-out both" : undefined,
      }}>
        Your revelation is complete.
      </p>
      <h1 style={{
        fontFamily: "Cormorant Garamond, serif",
        fontWeight: 300,
        fontSize: "clamp(56px, 10vw, 128px)",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        color: "#F2EEE8",
        margin: "0 0 28px 0",
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
      {seasonTagline && (
        <p style={{
          fontFamily: "Cormorant Garamond, serif",
          fontStyle: "italic",
          fontSize: 22,
          color: "#B8B0A4",
          maxWidth: 520,
          lineHeight: 1.5,
          borderLeft: "2px solid rgba(212,175,122,0.3)",
          paddingLeft: 24,
          paddingTop: 4,
          paddingBottom: 4,
          animation: reveal ? "fadeIn 0.9s ease-out 0.9s both" : undefined,
        }}>
          &ldquo;{seasonTagline}&rdquo;
        </p>
      )}
    </section>
  );
}
