import type { AnalysisResult, ColorSwatch } from "../../lib/types";
import { getSeasonMakeupSwatches } from "../../data/seasonColors";
import Footer from "../../components/Footer";
import SeasonHero from "./SeasonHero";
import AvoidSection from "./AvoidSection";
import ColorDNAPanel from "./ColorDNAPanel";
import SeasonStory from "./SeasonStory";
import HowToWearCards from "./HowToWearCards";
import ShareSection from "./ShareSection";
import { luminance, saturation } from "./utils";

/** Overview tab: hero, palette, analysis, story, wear cards, CTA, share, footer. */
export default function OverviewTab({
  data,
  seasonName,
  sessionId,
  onContinue,
}: {
  data: AnalysisResult;
  seasonName: string;
  sessionId?: string;
  onContinue: () => void;
}) {
  const palette = data.palette;
  const makeupSwatches = getSeasonMakeupSwatches(seasonName);
  // Use AI-returned personal DNA values; fall back to 50 (neutral) if missing
  const aiDNA = data.colorDNA;
  const colorDNA = {
    temperature: aiDNA?.warmth ?? 50,
    depth: aiDNA?.depth ?? 50,
    clarity: aiDNA?.clarity ?? 50,
    contrast: aiDNA?.contrast ?? 50,
  };

  // Deduplicated palette colors
  const uniquePalette = palette?.best?.filter((c: ColorSwatch, i: number, arr: ColorSwatch[]) => arr.findIndex(x => x.name === c.name) === i) || [];

  // Card 1: darkest/most neutral colors (low luminance + low saturation)
  const wardrobeColors = [...uniquePalette]
    .sort((a, b) => (luminance(a.hex) + saturation(a.hex) * 0.5) - (luminance(b.hex) + saturation(b.hex) * 0.5))
    .slice(0, 3);

  // Card 2: lip & blush shades from actual makeup swatch data
  const makeupChips = [
    ...makeupSwatches.lips.everyday.slice(0, 1),
    ...makeupSwatches.lips.bold.slice(0, 1),
    ...makeupSwatches.blush.slice(0, 1),
  ].map(s => ({ name: s.name, hex: s.hex }));

  // Card 3: most saturated/vivid colors
  const accentColors = [...uniquePalette]
    .sort((a, b) => saturation(b.hex) - saturation(a.hex))
    .slice(0, 3);

  return (
    <div className="animate-slide-up" style={{ margin: "0 auto", padding: "28px 0" }}>

      {/* ── Identity: season name + palette fan, unified for demo and live ── */}
      <SeasonHero data={data} seasonName={seasonName} sessionId={sessionId} />

      {/* ── Worth avoiding — dominant, all six clashing colors ── */}
      {palette && <AvoidSection avoid={palette.avoid} />}

      {/* ── Analysis + Color DNA (Two Columns) ── */}
      <ColorDNAPanel seasonName={seasonName} colorDNA={colorDNA} />

      {/* ── Season Story ── */}
      <SeasonStory seasonName={seasonName} seasonStory={data.seasonStory} colorDNA={colorDNA} />

      {/* ── How to Wear Your Palette (3 Cards) ── */}
      <HowToWearCards
        cards={[
          {
            title: "In Your Wardrobe",
            description: "Build your outfits around these grounding neutrals — they form the base of everything you wear.",
            chips: wardrobeColors.map((c: ColorSwatch) => ({ name: c.name, hex: c.hex })),
          },
          {
            title: "In Your Makeup",
            description: "These shades harmonise with your undertone for foundation, blush, bronzer, and lips.",
            chips: makeupChips,
          },
          {
            title: "As Your Accents",
            description: "Reach for these when you want to make a statement — in a bag, a lip colour, or a bold top.",
            chips: accentColors.map((c: ColorSwatch) => ({ name: c.name, hex: c.hex })),
          },
        ]}
      />

      {/* ── CTA: Continue to Beauty Guide ── */}
      <section style={{ marginBottom: 48, position: "relative" }}>
        <button
          onClick={onContinue}
          className="cursor-pointer"
          style={{
            display: "block",
            width: "100%",
            background: "#D4AF7A",
            color: "#0D0D0F",
            padding: "18px 48px",
            border: "none",
            borderRadius: 0,
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#EAD09A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#D4AF7A"; }}
        >
          Continue to Beauty Guide
        </button>
      </section>

      {/* ── Share ── */}
      <ShareSection seasonName={seasonName} />

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(78,70,57,0.2)", paddingTop: 32, textAlign: "center", paddingBottom: 16 }}>
        <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12, letterSpacing: "0.04em" }}>Your Aura</p>
        <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 14, color: "#B8B0A4", marginBottom: 8 }}>Created by Haneen</p>
        <a href="mailto:haneenabdulrahmand@gmail.com" style={{ fontSize: 12, color: "#B8B0A4", textDecoration: "none", opacity: 0.7 }}>haneenabdulrahmand@gmail.com</a>
        <Footer compact />
      </footer>

    </div>
  );
}
