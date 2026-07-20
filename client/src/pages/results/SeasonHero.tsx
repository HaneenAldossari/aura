/** Overview hero: season name display + tagline. */
export default function SeasonHero({
  seasonName,
  seasonTagline,
}: {
  seasonName: string;
  seasonTagline?: string;
}) {
  const seasonWords = seasonName.split(" ");

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
      }}>
        {seasonWords[0]} <span style={{ color: "#D4AF7A", fontStyle: "italic" }}>{seasonWords.slice(1).join(" ")}</span>
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
        }}>
          &ldquo;{seasonTagline}&rdquo;
        </p>
      )}
    </section>
  );
}
