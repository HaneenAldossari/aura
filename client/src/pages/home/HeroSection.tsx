import { useNavigate } from "react-router-dom";
import ShinyText from "../../components/ShinyText";
import BounceCards from "../../components/BounceCards";
import { bounceCardImages } from "./homeData";

const bounceTransforms = [
  "rotate(8deg) translate(-210px)",
  "rotate(4deg) translate(-140px)",
  "rotate(-2deg) translate(-70px)",
  "rotate(0deg)",
  "rotate(2deg) translate(70px)",
  "rotate(-4deg) translate(140px)",
  "rotate(-8deg) translate(210px)",
];

/* ─── Hero: Split Layout with BounceCards ── */
export default function HeroSection() {
  const navigate = useNavigate();

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
          AI-Powered Color Analysis
        </span>

        <h1 style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "clamp(44px, 6vw, 80px)",
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          marginBottom: "28px",
        }}>
          Discover the Colors
          <br />
          That Were{" "}
          <ShinyText
            text="Made for You"
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
          Upload one photo. Your Aura reads your undertone, depth, and contrast
          to reveal your seasonal color palette — your colors, your rules.
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
            Discover Your Palette
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
            How It Works
          </a>
        </div>

        {/* spacer */}
      </div>

      {/* Right: BounceCards */}
      <div style={{ flex: "0 0 auto" }}>
        <BounceCards
          className="custom-bounceCards"
          images={bounceCardImages}
          containerWidth={580}
          containerHeight={260}
          animationDelay={1.2}
          animationStagger={0.15}
          easeType="elastic.out(1, 0.6)"
          transformStyles={bounceTransforms}
          enableHover
        />
      </div>
    </section>
  );
}
