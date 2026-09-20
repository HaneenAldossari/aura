import { useNavigate } from "react-router-dom";
import { useT } from "../../i18n";

/* ─── CTA ────────────────────────── */
export default function CTASection() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <section style={{ padding: "100px 40px 120px", textAlign: "center", position: "relative", overflow: "hidden", zIndex: 10 }}>
      {/* Radial gold glow */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "700px",
        height: "700px",
        borderRadius: "50%",
        filter: "blur(140px)",
        background: "rgba(212,175,122,0.07)",
        pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 10 }}>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "clamp(36px, 6vw, 60px)", marginBottom: "24px", letterSpacing: "-0.02em" }}>
          {t("home.cta.title")}
        </h2>
        <p style={{ color: "var(--text-secondary)", maxWidth: "512px", margin: "0 auto 48px", fontSize: "18px", fontWeight: 300, lineHeight: 1.6 }}>
          {t("home.cta.body")}
        </p>
        <button
          onClick={() => navigate("/analyze")}
          style={{
            display: "inline-block",
            padding: "20px 48px",
            background: "var(--accent-gold)",
            color: "var(--bg-primary)",
            borderRadius: "9999px",
            fontWeight: 600,
            fontSize: "18px",
            border: "none",
            cursor: "pointer",
            transition: "transform 0.3s",
            animation: "pulse-glow 3s infinite",
          }}
        >
          {t("home.cta.button")}
        </button>
      </div>
    </section>
  );
}
