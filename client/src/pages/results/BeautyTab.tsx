import SplitText from "../../components/SplitText";
import type { Foundation, Makeup } from "../../lib/types";
import { getSeasonBeautyGuide } from "../../data/seasonBeautyGuide";
import { isWarmSeason } from "../../data/seasonColors";
import EditorialSection from "./MakeupSection";
import ShadeDab from "./ShadeDab";
import "./results-tabs.css";

/** Undertone families for the foundation bar, fair → deep. */
const WARM_UNDERTONES = ["#F6E7CF", "#EBC79B", "#D2A06A", "#A06B3C", "#5C3A22", "#2A1B10"];
const COOL_UNDERTONES = ["#F5E9E6", "#E5C9BD", "#C39A8C", "#8F6355", "#553A31", "#241813"];

const BRONZER_ROLES = ["day", "warmth", "sculpt"];

/** Loose overlapping cluster transforms for the eye palette. */
const EYE_ROTATIONS = [-6, 5, -4, 7, -5, 4, -6];
const EYE_OFFSETS = [0, 9, -5, 11, -3, 8, 0];

const captionStyle = {
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.65,
  marginTop: 16,
  marginBottom: 0,
  maxWidth: 560,
} as const;

const microLabelStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "var(--accent-gold)",
  marginBottom: 14,
} as const;

/**
 * Beauty tab — editorial shade guide. All shade content is season-derived
 * (seasonBeautyGuide) so demo and live analyses render identically; live-model
 * text extras (foundation tip, per-category notes) layer on top when present.
 */
export default function BeautyTab({
  makeup,
  seasonName,
  depth,
}: {
  makeup: Makeup;
  seasonName: string;
  /** colorDNA depth 0–100; positions the foundation marker (default 50) */
  depth?: number | null;
}) {
  const guide = getSeasonBeautyGuide(seasonName);
  const undertones = isWarmSeason(seasonName) ? WARM_UNDERTONES : COOL_UNDERTONES;
  const depthPct = Math.max(0, Math.min(100, depth ?? 50));

  // Foundation may arrive as an object ({recommended, avoid, tip}) or a legacy tip string
  const fd = makeup?.foundation as Foundation | string | undefined;
  const liveFoundationTip = typeof fd === "string" ? fd : fd?.tip;
  const foundationTip = liveFoundationTip || guide.foundationTip;

  const liveTip = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v : undefined;

  return (
    <div className="animate-slide-up">
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 44,
        }}
      >
        <SplitText
          key="beauty-heading"
          text="Your Beauty Guide"
          className="text-3xl font-bold"
          tag="h2"
          delay={30}
          duration={0.5}
        />

        {/* ── Foundation — honest undertone bar, no fake shade chips ── */}
        <EditorialSection title="Foundation" direction="Your undertone, met at its true depth.">
          <div style={{ paddingTop: 8 }}>
            <div
              role="img"
              aria-label={`Your undertone family from fair to deep, with your depth marked at ${Math.round(depthPct)} of 100`}
              style={{
                position: "relative",
                height: 14,
                borderRadius: 7,
                background: `linear-gradient(90deg, ${undertones.join(", ")})`,
                boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
              }}
            >
              {/* Gold diamond marker at colorDNA depth */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${depthPct}%`,
                  top: "50%",
                  width: 12,
                  height: 12,
                  transform: "translate(-50%, -50%) rotate(45deg)",
                  background: "var(--accent-gold)",
                  border: "1px solid var(--accent-gold-light)",
                  boxShadow: "0 0 8px rgba(212,175,122,0.65)",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 8,
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "var(--text-muted)",
              }}
            >
              <span>Fair</span>
              <span>Deep</span>
            </div>
            <p style={captionStyle}>{foundationTip}</p>
          </div>
        </EditorialSection>

        {/* ── Blush ── */}
        <EditorialSection title="Blush" direction="Where the color meets your cheekbone.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
            {guide.blush.map((s) => (
              <ShadeDab key={s.name} shade={s} />
            ))}
          </div>
          {liveTip(makeup?.blush) && <p style={captionStyle}>{makeup.blush}</p>}
        </EditorialSection>

        {/* ── Bronzer — light → deep with day / warmth / sculpt roles ── */}
        <EditorialSection title="Bronzer" direction="Warmth placed where the sun would find you.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 26, alignItems: "flex-start" }}>
            {guide.bronzer.map((s, i) => (
              <div key={s.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <ShadeDab shade={s} />
                {BRONZER_ROLES[i] && (
                  <span
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.18em",
                      color: "var(--accent-gold-dim)",
                    }}
                  >
                    {BRONZER_ROLES[i]}
                  </span>
                )}
              </div>
            ))}
          </div>
          {liveTip(makeup?.bronzer) && <p style={captionStyle}>{makeup.bronzer}</p>}
        </EditorialSection>

        {/* ── Lips — everyday and bold drops ── */}
        <EditorialSection title="Lips" direction="From barely-there to unmistakable.">
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div>
              <p style={microLabelStyle}>Everyday</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
                {guide.lips.everyday.map((s) => (
                  <ShadeDab key={s.name} shade={s} shape="drop" size={58} />
                ))}
              </div>
            </div>
            <div>
              <p style={microLabelStyle}>Bold</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
                {guide.lips.bold.map((s) => (
                  <ShadeDab key={s.name} shade={s} shape="drop" size={68} />
                ))}
              </div>
            </div>
          </div>
          {liveTip(makeup?.lips) && <p style={captionStyle}>{makeup.lips}</p>}
        </EditorialSection>

        {/* ── Eyes — loose overlapping cluster, like a used palette ── */}
        <EditorialSection title="Eyes" direction="Worn soft, the way a palette actually gets used.">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-start",
              paddingTop: 12,
              paddingLeft: 8,
            }}
          >
            {guide.eyes.map((s, i) => (
              <div
                key={s.name}
                style={{
                  transform: `rotate(${EYE_ROTATIONS[i % EYE_ROTATIONS.length]}deg) translateY(${EYE_OFFSETS[i % EYE_OFFSETS.length]}px)`,
                  marginLeft: i === 0 ? 0 : -14,
                  zIndex: i + 1,
                }}
              >
                <ShadeDab shade={s} size={62} />
              </div>
            ))}
          </div>
          {liveTip(makeup?.eyes) && <p style={{ ...captionStyle, marginTop: 26 }}>{makeup.eyes}</p>}
        </EditorialSection>

        {/* ── Nails — almond chips, then a recessive avoid row ── */}
        <EditorialSection title="Nails" direction="Ten small canvases, tuned to your season.">
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <p style={microLabelStyle}>Your shades</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
                {guide.nails.best.map((s) => (
                  <ShadeDab key={s.name} shade={s} shape="almond" size={58} />
                ))}
              </div>
            </div>
            {guide.nails.avoid.length > 0 && (
              <div>
                <p style={{ ...microLabelStyle, color: "var(--text-muted)" }}>Skip these</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
                  {guide.nails.avoid.map((s) => (
                    <ShadeDab key={s.name} shade={s} shape="almond" size={58} avoid />
                  ))}
                </div>
              </div>
            )}
          </div>
        </EditorialSection>
      </div>
    </div>
  );
}
