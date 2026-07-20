import SplitText from "../../components/SplitText";
import type { Makeup } from "../../lib/types";
import { getSeasonMakeupSwatches } from "../../data/seasonColors";
import { filterValidSwatches } from "../../utils/filterValidSwatches";
import { getMakeupSwatchImage } from "../../utils/makeupSwatchImage";
import { getNailMeta } from "../../utils/nailMetadata";
import { MakeupSwatch } from "../../components/MakeupSwatch";
import MakeupSection from "./MakeupSection";
import { normalizeNailColors } from "./utils";

/** Single nail shade: swatch + description/brand/shade-name labels. */
function NailShadeItem({ shadeName, avoid }: { shadeName: string; avoid?: boolean }) {
  const meta = getNailMeta(shadeName);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", ...(avoid ? { opacity: 0.85 } : {}) }}>
      <MakeupSwatch category="nails" name={shadeName} size={52} avoid={avoid} label={false} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", maxWidth: "92px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>
          {meta?.colorDescription ?? shadeName}
        </span>
        <span style={{ fontSize: "11px", color: "var(--accent-gold)", textAlign: "center", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {meta?.brand ?? ""}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", lineHeight: 1.3 }}>
          {meta?.shadeName ?? shadeName}
        </span>
      </div>
    </div>
  );
}

/** Beauty tab: makeup guide (config-driven sections) + nail guide. */
export default function BeautyTab({
  makeup,
  seasonName,
}: {
  makeup: Makeup;
  seasonName: string;
}) {
  const makeupSwatches = getSeasonMakeupSwatches(seasonName);
  const nailsRaw = makeup?.nails;
  const bestNails = normalizeNailColors(nailsRaw?.bestColors);
  const avoidNails = normalizeNailColors(nailsRaw?.avoidColors);

  // Foundation may arrive as an object ({recommended, avoid, tip}) or a legacy tip string
  const fd = makeup?.foundation as { recommended?: Array<{ name: string; hex: string }>; avoid?: Array<{ name: string; hex: string }>; tip?: string } | string | undefined;
  const isObj = fd && typeof fd === "object" && !Array.isArray(fd);
  const foundationRec = isObj ? filterValidSwatches("foundation", fd.recommended || []) : filterValidSwatches("foundation", makeupSwatches.foundation.recommended);
  const foundationAvoid = isObj ? filterValidSwatches("foundation", fd.avoid || []) : filterValidSwatches("foundation", makeupSwatches.foundation.avoid);
  const foundationTip = isObj ? fd.tip : (typeof fd === "string" ? fd : "");

  const sectionDivider = (
    <div className="h-px my-8" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />
  );

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex gap-2 mb-6">
        <button onClick={() => document.getElementById('section-makeup')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
          Makeup
        </button>
        <button onClick={() => document.getElementById('section-nails')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
          Nails
        </button>
      </div>

      <div id="section-makeup">
        {makeup && (
          <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <SplitText key="beauty-heading" text="Your Beauty Guide" className="text-3xl font-bold" tag="h2" delay={30} duration={0.5} />

            {/* Foundation */}
            <MakeupSection
              title="Foundation"
              category="foundation"
              gapClass="gap-4"
              groups={[
                { label: "Recommended Shades", swatches: foundationRec, hideWhenEmpty: true },
                { label: "Colours to Avoid", swatches: foundationAvoid, avoid: true, divider: true, hideWhenEmpty: true },
              ]}
              tip={foundationTip}
            />

            {sectionDivider}

            {/* Blush */}
            <MakeupSection
              title="Blush"
              category="blush"
              groups={[{ swatches: filterValidSwatches("blush", makeupSwatches.blush) }]}
              tip={makeup.blush as string}
            />

            {sectionDivider}

            {/* Bronzer */}
            <MakeupSection
              title="Bronzer"
              category="bronzer"
              groups={[
                { swatches: filterValidSwatches("bronzer", makeupSwatches.bronzer.yes) },
                { label: "Colours to Avoid", swatches: filterValidSwatches("bronzer", makeupSwatches.bronzer.no), avoid: true, divider: true, dividerMarginTop: "16px", hideWhenEmpty: true },
              ]}
              tip={makeup.bronzer as string}
            />

            {sectionDivider}

            {/* Lips */}
            <MakeupSection
              title="Lips"
              category="lips"
              groups={[
                { label: "Everyday", swatches: filterValidSwatches("lips", makeupSwatches.lips.everyday) },
                { label: "Bold", swatches: filterValidSwatches("lips", makeupSwatches.lips.bold) },
                { label: "Colours to Avoid", swatches: filterValidSwatches("lips", makeupSwatches.lips.avoid), avoid: true, divider: true },
              ]}
              tip={makeup.lips as string}
            />

            {sectionDivider}

            {/* Eye Makeup */}
            <MakeupSection
              title="Eye Makeup"
              subtitle="Eyeshadow, liner & brow shades"
              category="eyeshadow"
              groups={[{ swatches: filterValidSwatches("eyeshadow", makeupSwatches.eyes) }]}
              tip={makeup.eyes as string}
            />

          </div>
        )}
      </div>

      <div className="h-px my-10" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

      <div id="section-nails">
        <div className="animate-slide-up space-y-6 rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "0.5px solid var(--border-color)", borderRadius: "12px" }}>
          <div>
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Nail Guide</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Shades curated for your {seasonName} palette.</p>
          </div>

          <div className="flex flex-wrap gap-5 justify-start">
            {bestNails.filter(s => getMakeupSwatchImage("nails", s) !== null).map((shadeName) => (
              <NailShadeItem key={shadeName} shadeName={shadeName} />
            ))}
          </div>

          {/* Avoid Section */}
          {avoidNails.length > 0 && (
            <div className="space-y-3">
              <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px" }} />
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--accent-gold)', letterSpacing: "0.15em" }}>Colours to Avoid</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>These shades don't complement your undertone.</p>
              <div className="flex flex-wrap gap-5 justify-start">
                {avoidNails.filter(s => getMakeupSwatchImage("nails", s) !== null).map((shadeName) => (
                  <NailShadeItem key={shadeName} shadeName={shadeName} avoid />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
