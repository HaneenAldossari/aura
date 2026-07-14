import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ShinyText from "../components/ShinyText";
import BounceCards from "../components/BounceCards";

/* ─── Star Field Background ─────────────────────── */
interface Star {
  id: number;
  cx: number;
  cy: number;
  r: number;
  duration: number;
  delay: number;
}

function StarField() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generated = Array.from({ length: 220 }).map((_, i) => ({
      id: i,
      cx: Math.random() * 96 + 2,
      cy: Math.random() * 96 + 2,
      r: Math.random() * 1.1 + 0.3,
      duration: Math.random() * 4 + 2.5,
      delay: Math.random() * 9,
    }));
    setStars(generated);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
      <svg style={{ width: "100%", height: "100%" }}>
        {stars.map((star) => (
          <circle
            key={star.id}
            cx={`${star.cx}%`}
            cy={`${star.cy}%`}
            r={star.r}
            fill="var(--text-primary)"
            style={{
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ─── BounceCards Season Card SVG Images ────────── */
const bounceCardData = [
  { name: "Deep Autumn", colors: ["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"], desc: "Warm · Rich · Deep" },
  { name: "True Winter", colors: ["#1B1B2E", "#8B2040", "#4A4A8A", "#C8D4E8", "#2A4A6B", "#FFFFFF"], desc: "Cool · Crisp · Bold" },
  { name: "Light Spring", colors: ["#F0C8A8", "#E8A89A", "#F0D4B8", "#C8D4A8", "#E8C4B8", "#F0E8D4"], desc: "Soft · Warm · Bright" },
  { name: "Soft Summer", colors: ["#8B7A8B", "#C4B4C4", "#A89AAA", "#D4C4D4", "#7A8A9A", "#B4C4C4"], desc: "Cool · Muted · Gentle" },
  { name: "Dark Winter", colors: ["#1A1A2E", "#6B1A3A", "#3A3A6A", "#B0C0D0", "#2A3A5A", "#E0E0E8"], desc: "Cool · Deep · Vivid" },
  { name: "Warm Spring", colors: ["#E8B88A", "#D4946A", "#E8C49A", "#A8C488", "#D4A878", "#F0D8B4"], desc: "Warm · Clear · Fresh" },
  { name: "True Autumn", colors: ["#8B4A2A", "#C47240", "#B88330", "#6B5A2A", "#3D4A2A", "#C88C3C"], desc: "Warm · Earthy · Rich" },
];

function makeSeasonCardSvg(name: string, colors: string[], desc: string): string {
  const w = 200;
  const h = 267;
  const stripH = Math.round(h * 0.38);
  const segW = w / colors.length;
  const strips = colors.map((c, i) => `<rect x="${i * segW}" y="0" width="${segW + 1}" height="${stripH}" fill="${c}"/>`).join("");
  // Individual swatches row
  const swatchY = stripH + 60;
  const swatchR = 8;
  const swatchGap = w / (colors.length + 1);
  const swatches = colors.map((c, i) => `<circle cx="${swatchGap * (i + 1)}" cy="${swatchY}" r="${swatchR}" fill="${c}" opacity="0.85"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#131316"/>
    ${strips}
    <line x1="40" y1="${stripH + 20}" x2="160" y2="${stripH + 20}" stroke="#D4AF7A" stroke-width="0.5" opacity="0.3"/>
    <text x="${w / 2}" y="${stripH + 42}" text-anchor="middle" font-family="Georgia,serif" font-size="17" fill="#D4AF7A" letter-spacing="1.5">${name}</text>
    ${swatches}
    <text x="${w / 2}" y="${swatchY + 28}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="#807870" letter-spacing="1.5">${desc}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const bounceCardImages = bounceCardData.map((d) => makeSeasonCardSvg(d.name, d.colors, d.desc));

/* ─── Season Carousel Data (all 12) ──────────── */
const seasonCarouselData = [
  { name: "Deep Autumn", colors: ["#6B2737", "#C4714A", "#B8834A", "#6B7A3A", "#3D5C3A", "#C8963C"], desc: "Warm · Rich · Deep", line: "Think olive, rust, burgundy, and deep gold" },
  { name: "True Winter", colors: ["#1B1B2E", "#8B2040", "#4A4A8A", "#C8D4E8", "#2A4A6B", "#FFFFFF"], desc: "Cool · Crisp · Bold", line: "Icy brights, jewel tones, and stark contrasts" },
  { name: "Light Spring", colors: ["#F0C8A8", "#E8A89A", "#F0D4B8", "#C8D4A8", "#E8C4B8", "#F0E8D4"], desc: "Warm · Soft · Bright", line: "Peach, coral, warm pastels, and golden highlights" },
  { name: "Soft Summer", colors: ["#8B7A8B", "#C4B4C4", "#A89AAA", "#D4C4D4", "#7A8A9A", "#B4C4C4"], desc: "Cool · Muted · Gentle", line: "Dusty rose, lavender, sage, and soft blues" },
  { name: "True Autumn", colors: ["#8B4A2A", "#C47240", "#B88330", "#6B5A2A", "#3D4A2A", "#C88C3C"], desc: "Warm · Earthy · Rich", line: "Terracotta, pumpkin, moss, and caramel tones" },
  { name: "Dark Winter", colors: ["#1A1A2E", "#6B1A3A", "#3A3A6A", "#B0C0D0", "#2A3A5A", "#E0E0E8"], desc: "Cool · Deep · Vivid", line: "Rich plum, emerald, navy, and deep berry" },
  { name: "Warm Spring", colors: ["#E8B88A", "#D4946A", "#E8C49A", "#A8C488", "#D4A878", "#F0D8B4"], desc: "Warm · Clear · Fresh", line: "Warm coral, golden yellow, and fresh greens" },
  { name: "Cool Winter", colors: ["#2A2A3E", "#9A2850", "#5A5A9A", "#D0D8E8", "#3A5A7A", "#F0F0F8"], desc: "Cool · Icy · Pure", line: "Fuchsia, royal blue, icy pink, and true white" },
  { name: "Warm Autumn", colors: ["#7A3A1A", "#B46A38", "#A07A28", "#5A5A1A", "#4A5A2A", "#B88438"], desc: "Warm · Muted · Golden", line: "Amber, mustard, warm olive, and copper hues" },
  { name: "Light Summer", colors: ["#9A8AAA", "#D4C8D8", "#B8A8C0", "#E0D4E0", "#8A9AAA", "#C4D4D8"], desc: "Cool · Light · Soft", line: "Powder blue, soft mauve, and cool pastels" },
  { name: "Bright Spring", colors: ["#E89870", "#F0B868", "#E8D070", "#70C088", "#60A8D0", "#E87898"], desc: "Warm · Vivid · Clear", line: "Bright coral, turquoise, warm red, and citrus" },
  { name: "Soft Autumn", colors: ["#8A6A4A", "#B8946A", "#A89858", "#6A7A4A", "#5A6A4A", "#C8A868"], desc: "Warm · Soft · Muted", line: "Camel, sage, muted teal, and warm taupe" },
];

/* ─── Feature Mockup Renderer ─────────────────── */
function FeatureMockup({ index }: { index: number }) {
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

/* ─── Section Divider ───────────────────────────── */
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
  const [activeFeature, setActiveFeature] = useState(0);

  const bounceTransforms = [
    "rotate(8deg) translate(-210px)",
    "rotate(4deg) translate(-140px)",
    "rotate(-2deg) translate(-70px)",
    "rotate(0deg)",
    "rotate(2deg) translate(70px)",
    "rotate(-4deg) translate(140px)",
    "rotate(-8deg) translate(210px)",
  ];

  const featureCards = [
    { key: "season", title: "Your Season", desc: "Your personal season from the 12-season system with complete colour analysis" },
    { key: "palette", title: "Color Palette", desc: "12 curated shades in your exact seasonal colours" },
    { key: "beauty", title: "Beauty Guide", desc: "Foundation, blush, bronzer, lips, and eyeshadow matched to your undertone" },
    { key: "nails", title: "Nail Guide", desc: "3 nail swatches perfectly matched to your palette" },
    { key: "metals", title: "Metals & Gemstones", desc: "Your ideal jewellery metals and gemstone recommendations" },
    { key: "check", title: "Before You Buy", desc: "Upload any product photo to check if it matches your palette" },
  ];

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

      {/* ─── Hero: Split Layout with BounceCards ── */}
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

      <GoldDivider />

      {/* ─── Precision Meets Poetry ──────── */}
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
            Precision Meets Poetry
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
            We combine advanced AI color science with an artistic eye to decode
            the hues that make you radiant.
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
            From a single portrait to your complete colour world.
          </p>
        </div>
      </section>

      <GoldDivider />

      {/* ─── Path to Discovery ──────────── */}
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

      <GoldDivider />

      {/* ─── What You Get ──────────────── */}
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
          What You Get
        </h2>
        <div style={{ width: "40px", height: "1px", background: "var(--accent-gold)", marginBottom: "48px" }} />

        <div className="features-layout" style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* Left: text list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0" }}>
            {featureCards.map((f, i) => {
              const isActive = i === activeFeature;
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFeature(i)}
                  style={{
                    display: "block",
                    padding: "18px 20px",
                    background: "transparent",
                    border: "none",
                    borderLeft: isActive ? "2px solid var(--accent-gold)" : "2px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
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
                    {f.title}
                  </h4>
                  <p style={{
                    fontSize: "13px",
                    color: isActive ? "var(--text-secondary)" : "var(--text-muted)",
                    lineHeight: 1.5,
                    margin: 0,
                    transition: "color 0.3s",
                  }}>
                    {f.desc}
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

      <GoldDivider />

      {/* ─── Season Carousel (moving tape) ── */}
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

      <GoldDivider />

      {/* ─── CTA ────────────────────────── */}
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
            Ready to Meet Your Colors?
          </h2>
          <p style={{ color: "var(--text-secondary)", maxWidth: "512px", margin: "0 auto 48px", fontSize: "18px", fontWeight: 300, lineHeight: 1.6 }}>
            Upload one photo and discover the palette that was always meant for you.
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
            Discover Your Palette
          </button>
        </div>
      </section>

      {/* ─── Footer ─────────────────────── */}
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
          Created by Haneen · AI Color Analysis · 2025
        </p>
      </footer>
    </div>
  );
}
