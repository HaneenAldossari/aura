import SplitText from "../../components/SplitText";
import type { AnalysisResult } from "../../lib/types";
import { getJewelrySwatches } from "../../data/seasonColors";
import { MetalCircle, ALL_METALS, METAL_FILE_MAP } from "../../components/MetalCircle";
import { GemstoneCard } from "../../components/GemstoneCard";
import { HairCard } from "../../components/HairCard";
import { getHairShadesForSeason, getHairSubtitle } from "../../data/hairShadeLibrary";

/** Style tab: metals, gemstones, style tips, and the hair color guide. */
export default function StyleTab({
  data,
  seasonName,
}: {
  data: AnalysisResult;
  seasonName: string;
}) {
  const palette = data.palette;
  const jewelry = data.jewelry;
  const hairColor = data.hairColor;
  const jewelrySwatches = getJewelrySwatches(seasonName);
  const hairShades = getHairShadesForSeason(seasonName);
  const hairSubtitle = getHairSubtitle(seasonName);

  return (
    <div className="animate-slide-up space-y-6">

      <div id="section-jewelry">
        {jewelry && (
          <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
            <SplitText key="style-heading" text="Your Style Guide" className="text-3xl font-bold" tag="h2" delay={30} duration={0.5} />

            <div className="space-y-3">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Metals</h3>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                {ALL_METALS.map((metal) => {
                  const file = METAL_FILE_MAP[metal.toLowerCase()];
                  const rec = (palette.metals?.best || []).map((m: string) => m.toLowerCase());
                  return (
                    <MetalCircle
                      key={metal}
                      metal={file as "rose-gold" | "silver" | "gold"}
                      recommended={rec.includes(metal.toLowerCase()) || rec.some((r: string) => METAL_FILE_MAP[r] === file)}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Gemstones</h3>
              <div className="flex flex-wrap gap-5">
                {(data.gemstones || []).length > 0
                  ? data.gemstones.map((g) => (
                      <GemstoneCard key={g.name} name={g.name} />
                    ))
                  : jewelrySwatches.stones.map((s) => (
                      <GemstoneCard key={s.name} name={s.name} />
                    ))
                }
              </div>
            </div>

            {jewelry.style && (
              <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Style Tips</p>
                <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{jewelry.style}</p>
              </div>
            )}

            {/* Avoided Metals — faded discs */}
            {palette.metals?.avoid && palette.metals.avoid.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>Colours to Avoid</p>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  {palette.metals.avoid.map((metalName: string) => {
                    const file = METAL_FILE_MAP[metalName.toLowerCase()];
                    const METAL_GRADIENT: Record<string, string> = {
                      "copper": "radial-gradient(circle at 35% 35%, #D4855C, #8B4513)",
                      "bronze": "radial-gradient(circle at 35% 35%, #CD7F32, #8B6914)",
                    };
                    const hasFile = file && ["rose-gold", "silver", "gold"].includes(file);
                    return (
                      <div key={metalName} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                        {hasFile ? (
                          <img loading="lazy" decoding="async"
                            src={`/makeup/metals/${file}.webp`}
                            alt={metalName}
                            style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", filter: "saturate(0.4) opacity(0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                          />
                        ) : (
                          <div style={{ width: 52, height: 52, borderRadius: "50%", background: METAL_GRADIENT[metalName.toLowerCase()] || "radial-gradient(circle at 35% 35%, #B87333, #704214)", filter: "saturate(0.4) opacity(0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }} />
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{metalName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="h-px my-10" style={{ background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />

      <div id="section-hair">
        <div className="animate-slide-up space-y-8 rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Hair Color Guide</h2>
            <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontWeight: 300, fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
              {hairSubtitle}
            </p>
          </div>

          {/* Recommended hair shades */}
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>Recommended</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {hairShades.best.map((shade) => (
                <HairCard key={shade.id} shade={shade} />
              ))}
            </div>
          </div>

          {/* Avoid hair shades */}
          {hairShades.avoid.length > 0 && (
            <div>
              <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: 12 }} />
              <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent-gold)', letterSpacing: "0.15em", fontWeight: 500 }}>
                Colours to Avoid
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {hairShades.avoid.map((shade) => (
                  <HairCard key={shade.id} shade={shade} avoid />
                ))}
              </div>
            </div>
          )}

          {/* Additional tips from AI analysis */}
          {hairColor && hairColor.bestHighlights && (
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Best Highlights</p>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{hairColor.bestHighlights}</p>
            </div>
          )}
          {hairColor && hairColor.bestOverall && (
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--accent-gold)' }}>Overall Direction</p>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--text-primary)' }}>{hairColor.bestOverall}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
