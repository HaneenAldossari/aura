import { useT } from "../../i18n";
/* ─── Precision Meets Poetry ──────── */
export default function PoetrySection() {
  const t = useT();

  return (
    <section style={{
      position: "relative", zIndex: 10,
      padding: "100px 40px 60px",
      maxWidth: "1200px",
      margin: "0 auto",
    }}>
      <div style={{ textAlign: "center", position: "relative" }}>
        {/* Large decorative quotation mark watermark */}
        <span style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(200px, 28vw, 360px)",
          color: "var(--accent-gold)",
          opacity: 0.10,
          lineHeight: 0.6,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
          pointerEvents: "none",
          zIndex: 0,
          userSelect: "none",
        }}>
          &ldquo;
        </span>
        <h2 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(32px, 5vw, 52px)",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          marginBottom: "20px",
          position: "relative",
          zIndex: 1,
        }}>
          {t("home.poetry.title")}
        </h2>
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "clamp(15px, 1.8vw, 18px)",
          maxWidth: "560px",
          margin: "0 auto",
          lineHeight: 1.7,
          fontWeight: 300,
          position: "relative",
          zIndex: 1,
        }}>
          {t("home.poetry.body")}
        </p>
        <p style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "20px",
          fontStyle: "italic",
          color: "var(--accent-gold)",
          marginTop: "24px",
          position: "relative",
          zIndex: 1,
        }}>
          {t("home.poetry.closing")}
        </p>
      </div>
    </section>
  );
}
