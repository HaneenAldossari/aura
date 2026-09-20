import { useState } from "react";
import FeatureMockup from "./FeatureMockup";
import { useT } from "../../i18n";

/* Keys only — the copy lives in the catalogue, resolved per render so a locale
   change re-labels the list without remounting it. */
const featureCards = ["season", "palette", "beauty", "nails", "metals", "check"] as const;

/* ─── What You Get ──────────────── */
export default function WhatYouGetSection() {
  const t = useT();
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section style={{
      position: "relative", zIndex: 10,
      padding: "100px 40px",
      maxWidth: "1200px",
      margin: "0 auto",
    }}>
      <h2 style={{
        fontFamily: "Cormorant Garamond, serif",
        fontSize: "clamp(32px, 5vw, 48px)",
        marginBottom: "16px",
        letterSpacing: "-0.02em",
      }}>
        {t("home.whatYouGet.title")}
      </h2>
      <div style={{ width: "40px", height: "1px", background: "var(--accent-gold)", marginBottom: "48px" }} />

      <div className="features-layout" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
        {/* Left: text list */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0" }}>
          {featureCards.map((key, i) => {
            const isActive = i === activeFeature;
            return (
              <button
                key={key}
                onClick={() => setActiveFeature(i)}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  background: "transparent",
                  border: "none",
                  borderInlineStart: isActive ? "2px solid var(--accent-gold)" : "2px solid transparent",
                  cursor: "pointer",
                  textAlign: "start",
                  transition: "all 0.3s ease",
                }}
              >
                <h4 style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontSize: "20px",
                  color: isActive ? "var(--accent-gold)" : "var(--text-primary)",
                  marginBottom: "4px",
                  letterSpacing: "0.03em",
                  transition: "color 0.3s",
                }}>
                  {t(`home.whatYouGet.${key}Title` as const)}
                </h4>
                <p style={{
                  fontSize: "13px",
                  color: isActive ? "var(--text-secondary)" : "var(--text-muted)",
                  lineHeight: 1.5,
                  margin: 0,
                  transition: "color 0.3s",
                }}>
                  {t(`home.whatYouGet.${key}Body` as const)}
                </p>
              </button>
            );
          })}
        </div>

        {/* Right: preview card */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            key={activeFeature}
            style={{
              width: "100%",
              maxWidth: "420px",
              borderRadius: "20px",
              padding: "36px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-elevated), 0 0 32px rgba(212,175,122,0.06)",
              animation: "crossfade-in 0.4s ease-out",
            }}
          >
            {/* Mock window dots */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(212,175,122,0.4)" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(212,175,122,0.2)" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(212,175,122,0.1)" }} />
            </div>
            <FeatureMockup index={activeFeature} />
          </div>
        </div>
      </div>
    </section>
  );
}
