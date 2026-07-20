/* ─── Path to Discovery ──────────── */
export default function JourneySection() {
  return (
    <section id="journey" style={{
      position: "relative", zIndex: 10,
      padding: "100px 40px",
      maxWidth: "900px",
      margin: "0 auto",
    }}>
      <div style={{ textAlign: "center", marginBottom: "72px" }}>
        <span style={{ color: "var(--accent-gold)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", display: "block", marginBottom: "16px" }}>
          How It Works
        </span>
        <h2 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(28px, 4vw, 44px)",
          letterSpacing: "-0.02em",
        }}>
          Path to Discovery
        </h2>
        <div style={{ width: "40px", height: "1px", background: "var(--accent-gold)", margin: "24px auto 0" }} />
      </div>

      <div style={{ position: "relative" }}>
        {/* Floating star that drifts across the section */}
        <svg
          viewBox="0 0 900 360"
          fill="none"
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Soft glow */}
          <circle r="20" fill="var(--accent-gold)" opacity="0.08">
            <animateMotion
              dur="8s"
              repeatCount="indefinite"
              path="M 80,180 C 200,40 350,320 450,180 C 550,40 700,320 820,180"
            />
          </circle>
          {/* Star shape */}
          <g opacity="0.6">
            <animateMotion
              dur="8s"
              repeatCount="indefinite"
              path="M 80,180 C 200,40 350,320 450,180 C 550,40 700,320 820,180"
            />
            <polygon
              points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8"
              fill="var(--accent-gold)"
            >
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
            </polygon>
          </g>
        </svg>

        <div className="journey-steps" style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          position: "relative",
          zIndex: 1,
        }}>
          {[
            { title: "Upload", sub: "A clear photo of your face in natural light — that's all we need to begin." },
            { title: "Analyse", sub: "AI reads your skin undertone, eye color, and natural contrast level in seconds." },
            { title: "Discover", sub: "Your complete color season, palette, and personalized beauty guide — revealed." },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "32px 28px",
                borderRadius: "16px",
                background: "rgba(13,13,15,0.93)",
                border: "1px solid var(--border-color)",
                animation: `float-${i} ${3.5 + i * 0.5}s ease-in-out infinite`,
                textAlign: "center",
              }}
            >
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(212,175,122,0.1)",
                border: "1px solid rgba(212,175,122,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "16px",
                color: "var(--accent-gold)",
              }}>
                {i + 1}
              </div>
              <h3 style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "24px",
                color: "var(--accent-gold)",
                marginBottom: "10px",
                letterSpacing: "0.05em",
              }}>
                {step.title}
              </h3>
              <p style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                lineHeight: 1.6,
                margin: 0,
                maxWidth: "220px",
                marginLeft: "auto",
                marginRight: "auto",
              }}>
                {step.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
