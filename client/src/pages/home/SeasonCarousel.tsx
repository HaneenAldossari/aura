import { seasonCarouselData } from "./homeData";

/* ─── Season Carousel (moving tape) ── */
export default function SeasonCarousel() {
  return (
    <section style={{
      position: "relative", zIndex: 10,
      padding: "60px 0",
      overflow: "hidden",
    }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(24px, 3.5vw, 36px)",
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}>
          Which Season Are You?
        </h2>
      </div>

      <div style={{
        display: "flex",
        gap: "20px",
        animation: "marquee 90s linear infinite",
        width: "max-content",
      }}>
        {[...seasonCarouselData, ...seasonCarouselData].map((season, i) => (
          <div key={i} style={{
            flexShrink: 0,
            width: "200px",
            borderRadius: "14px",
            overflow: "hidden",
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}>
            {/* Color strip */}
            <div style={{ display: "flex", height: "40px" }}>
              {season.colors.map((c, j) => (
                <div key={j} style={{ flex: 1, backgroundColor: c }} />
              ))}
            </div>
            {/* Label */}
            <div style={{ padding: "16px 14px", textAlign: "center" }}>
              <p style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "16px",
                color: "var(--accent-gold)",
                letterSpacing: "0.05em",
                margin: 0,
                marginBottom: "4px",
              }}>
                {season.name}
              </p>
              <p style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                margin: 0,
                marginBottom: "8px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {season.desc}
              </p>
              <p style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: 1.4,
                fontStyle: "italic",
              }}>
                {season.line}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
