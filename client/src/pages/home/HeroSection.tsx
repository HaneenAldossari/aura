import { useNavigate } from "react-router-dom";
import ShinyText from "../../components/ShinyText";
import DrapeWall from "./DrapeWall";
import { useT } from "../../i18n";

/* ─── Hero: Split Layout with the Drape Wall ── */
export default function HeroSection() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <section style={{
      position: "relative", zIndex: 10,
      minHeight: "85vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 40px",
      gap: "60px",
      flexWrap: "wrap",
    }}>
      {/* Left: Text */}
      <div style={{ flex: "1 1 480px", maxWidth: "560px", animation: "fade-up 0.8s ease-out both" }}>
        <span style={{ color: "var(--accent-gold)", fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", display: "block", marginBottom: "24px" }}>
          {t("home.eyebrow")}
        </span>

        <h1 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(44px, 6vw, 80px)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          marginBottom: "28px",
        }}>
          {t("home.titleLine1")}
          <br />
          {t("home.titleLine2Lead")}{" "}
          <ShinyText
            text={t("home.titleLine2Accent")}
            speed={2.5}
            delay={0.3}
            color="#D4AF7A"
            shineColor="#FFFFFF"
            spread={90}
            direction="left"
            yoyo={false}
            pauseOnHover={false}
            className="shiny-hero"
            style={{ fontStyle: "italic", fontWeight: 300 }}
          />
        </h1>

        <p style={{
          color: "var(--text-secondary)",
          fontSize: "clamp(16px, 2vw, 19px)",
          lineHeight: 1.7,
          fontWeight: 300,
          marginBottom: "40px",
          maxWidth: "480px",
        }}>
          {t("home.lede")}
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "48px" }}>
          <button
            onClick={() => navigate("/analyze")}
            style={{
              padding: "16px 40px",
              background: "var(--accent-gold)",
              color: "var(--bg-primary)",
              borderRadius: "9999px",
              fontWeight: 500,
              fontSize: "16px",
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s",
            }}
          >
            {t("home.ctaPrimary")}
          </button>
          <a
            href="#journey"
            style={{
              padding: "16px 40px",
              border: "1px solid rgba(212,175,122,0.3)",
              borderRadius: "9999px",
              fontWeight: 500,
              fontSize: "16px",
              color: "var(--text-primary)",
              textDecoration: "none",
              transition: "background 0.3s",
            }}
          >
            {t("home.ctaSecondary")}
          </a>
        </div>

        {/* spacer */}
      </div>

      {/* Right: The Drape Wall */}
      <div style={{ flex: "0 0 auto", maxWidth: "100%", minWidth: 0 }}>
        <DrapeWall />
      </div>
    </section>
  );
}
