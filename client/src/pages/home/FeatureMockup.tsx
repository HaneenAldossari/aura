/* ─── Feature Mockup Renderer ─────────────────── */
export default function FeatureMockup({ index }: { index: number }) {
  const imgStyle = { width: 48, height: 48, borderRadius: "50%", objectFit: "cover" as const, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" };
  const labelStyle = { fontSize: "10px", letterSpacing: "0.24em", color: "var(--accent-gold)", textTransform: "uppercase" as const };
  const titleStyle = { fontFamily: "Cormorant Garamond, serif", fontSize: "26px", marginTop: "8px", marginBottom: "20px", color: "var(--text-primary)" };

  switch (index) {
    case 0:
      return (
        <div>
          <span style={labelStyle}>Season Result</span>
          <h4 style={titleStyle}>Deep Autumn</h4>
          <div style={{ display: "flex", width: "100%", height: "20px", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
            {["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"].map((c, j) => (
              <div key={j} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </div>
          <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(212,175,122,0.08)", border: "1px solid rgba(212,175,122,0.15)" }}>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "4px" }}>Undertone</p>
            <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: 0 }}>Warm · Deep · Muted</p>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "16px", lineHeight: 1.6 }}>
            Rich, warm, and grounded — think olive, rust, burgundy, and deep gold.
          </p>
        </div>
      );

    case 1: {
      const best = ["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"];
      const avoid = ["#FF69B4", "#00FFFF", "#FF00FF"];
      return (
        <div>
          <span style={labelStyle}>Your Palette</span>
          <h4 style={titleStyle}>Best Colors</h4>
          <div style={{ display: "flex", width: "100%", height: "20px", borderRadius: "4px", overflow: "hidden", marginBottom: "20px" }}>
            {best.map((c, j) => (
              <div key={j} style={{ flex: 1, backgroundColor: c }} />
            ))}
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "8px" }}>Colors to Avoid</p>
          <div style={{ display: "flex", gap: "10px" }}>
            {avoid.map((c, j) => (
              <div key={j} style={{ position: "relative", width: 36, height: 36, borderRadius: "50%", backgroundColor: c, opacity: 0.5 }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "rgba(255,255,255,0.7)" }}>✕</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 2:
      return (
        <div>
          <span style={labelStyle}>Beauty Match</span>
          <h4 style={titleStyle}>Lips & Cheeks</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { label: "Lips", img: "/makeup/lips/warm-coral.png", name: "Warm Coral" },
              { label: "Blush", img: "/makeup/blush/Peach.png", name: "Peach" },
              { label: "Bronzer", img: "/makeup/bronzer/golden-bronze.png", name: "Golden Bronze" },
              { label: "Eyeshadow", img: "/makeup/eyeshadow/copper.png", name: "Copper" },
            ].map((item, j) => (
              <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "10px", borderRadius: "8px", background: "rgba(212,175,122,0.05)" }}>
                <img src={item.img} alt={item.name} style={imgStyle} />
                <span style={{ fontSize: "9px", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.15em" }}>{item.label}</span>
                <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 3:
      return (
        <div>
          <span style={labelStyle}>Nail Shades</span>
          <h4 style={titleStyle}>Top Picks</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            {[
              { img: "/makeup/nails/big-apple-red.png", name: "Big Apple Red", brand: "OPI" },
              { img: "/makeup/nails/malaga-wine.png", name: "Malaga Wine", brand: "OPI" },
              { img: "/makeup/nails/cajun-shrimp.png", name: "Cajun Shrimp", brand: "OPI" },
            ].map((item, j) => (
              <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                <div style={{
                  width: 60,
                  height: 80,
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "rgba(212,175,122,0.04)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <img src={item.img} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>{item.name}</span>
                <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{item.brand}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 4:
      return (
        <div>
          <span style={labelStyle}>Metal Match</span>
          <h4 style={titleStyle}>Your Metals</h4>
          <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
            {[
              { img: "/makeup/metals/gold.png", name: "Gold", rec: true },
              { img: "/makeup/metals/rose-gold.png", name: "Rose Gold", rec: true },
              { img: "/makeup/metals/silver.png", name: "Silver", rec: false },
            ].map((item, j) => (
              <div key={j} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ position: "relative" }}>
                  <img
                    src={item.img}
                    alt={item.name}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: item.rec ? "2px solid var(--accent-gold)" : "2px solid rgba(220,38,38,0.4)",
                      opacity: item.rec ? 1 : 0.4,
                      filter: item.rec ? "none" : "grayscale(0.3)",
                    }}
                  />
                  {item.rec ? (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "var(--accent-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--bg-primary)" }}>✓</div>
                  ) : (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "#E05555", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff" }}>✕</div>
                  )}
                </div>
                <span style={{ fontSize: "11px", color: item.rec ? "var(--text-primary)" : "var(--text-muted)" }}>{item.name}</span>
                <span style={{ fontSize: "9px", color: item.rec ? "var(--accent-gold)" : "#E05555", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {item.rec ? "Ideal" : "Not Ideal"}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 5:
      return (
        <div>
          <span style={labelStyle}>Color Check</span>
          <h4 style={titleStyle}>Before You Buy</h4>
          <div style={{ padding: "18px", borderRadius: "12px", background: "rgba(212,175,122,0.06)", border: "1px solid rgba(212,175,122,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
              <div style={{ width: 48, height: 48, borderRadius: "10px", background: "linear-gradient(135deg, #D2691E, #A0522D)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: "14px", color: "var(--text-primary)", margin: 0, fontWeight: 500 }}>Terracotta Blush</p>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>NARS · Bronzer</p>
              </div>
              <div style={{
                padding: "5px 14px",
                borderRadius: "9999px",
                background: "rgba(76,175,80,0.15)",
                border: "1px solid rgba(76,175,80,0.3)",
                fontSize: "12px",
                fontWeight: 600,
                color: "#4CAF50",
                letterSpacing: "0.05em",
              }}>
                Match
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div style={{ flex: 1, height: 6, borderRadius: "9999px", background: "rgba(212,175,122,0.15)", overflow: "hidden" }}>
                <div style={{ width: "92%", height: "100%", borderRadius: "9999px", background: "linear-gradient(90deg, var(--accent-gold), #4CAF50)" }} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#4CAF50" }}>92%</span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              This warm terracotta sits perfectly in your Deep Autumn palette — it complements your warm undertone and rich depth.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
