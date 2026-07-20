import { useNavigate } from "react-router-dom";
import StarField from "../components/StarField";
import HeroSection from "./home/HeroSection";
import PoetrySection from "./home/PoetrySection";
import JourneySection from "./home/JourneySection";
import WhatYouGetSection from "./home/WhatYouGetSection";
import SeasonCarousel from "./home/SeasonCarousel";
import CTASection from "./home/CTASection";

/* ─── Section Divider ───────────────────────────── */
// NOTE: intentionally NOT the shared ui/GoldDivider — that one renders a
// centered diamond hairline; Home uses a plain full-width rule.
function GoldDivider() {
  return (
    <div style={{
      width: "100%",
      height: "1px",
      background: "rgba(200,150,60,0.2)",
      position: "relative",
      zIndex: 10,
    }} />
  );
}

/* ─── Main Component ────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <StarField />

      {/* ─── Navbar ─────────────────────── */}
      <nav style={{ position: "relative", zIndex: 50, padding: "32px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontFamily: "Cormorant Garamond, serif", fontWeight: 300, fontSize: "16px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--accent-gold)", lineHeight: 1 }}>
            your
          </span>
          <span style={{ fontFamily: "Cormorant Garamond, serif", fontWeight: 500, fontSize: "38px", letterSpacing: "0.08em", color: "var(--text-primary)", lineHeight: 1 }}>
            Aura
          </span>
        </div>
        <button
          onClick={() => navigate("/analyze")}
          style={{ padding: "10px 24px", borderRadius: "9999px", fontSize: "14px", fontWeight: 600, background: "var(--accent-gold)", color: "var(--bg-primary)", border: "none", cursor: "pointer", transition: "transform 0.2s" }}
        >
          Get Started
        </button>
      </nav>

      <HeroSection />

      <GoldDivider />

      <PoetrySection />

      <GoldDivider />

      <JourneySection />

      <GoldDivider />

      <WhatYouGetSection />

      <GoldDivider />

      <SeasonCarousel />

      <GoldDivider />

      <CTASection />

      {/* ─── Footer ─────────────────────── */}
      {/* NOTE: intentionally NOT the shared Footer — its default variant uses a
          different brand line (20px "your Aura" with gold accent), border color
          and padding than Home's uppercase 14px footer. */}
      <footer style={{
        padding: "48px 0",
        borderTop: "1px solid rgba(200,150,60,0.2)",
        textAlign: "center",
        position: "relative",
        zIndex: 10,
      }}>
        <div style={{ marginBottom: "8px" }}>
          <span style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: "14px",
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}>
            Your Aura
          </span>
        </div>
        <p style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          margin: 0,
          opacity: 0.7,
        }}>
          Created by Haneen · AI Color Analysis · {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
