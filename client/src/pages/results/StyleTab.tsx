import SplitText from "../../components/SplitText";
import type { AnalysisResult } from "../../lib/types";
import { getSeasonBeautyGuide } from "../../data/seasonBeautyGuide";
import { MetalCircle, ALL_METALS, METAL_FILE_MAP } from "../../components/MetalCircle";
import { HairCard } from "../../components/HairCard";
import { getHairShadesForSeason, getHairSubtitle } from "../../data/hairShadeLibrary";
import EditorialSection from "./MakeupSection";
import GemFacet from "./GemFacet";
import { useT } from "../../i18n";
import "./results-tabs.css";

const groupLabelStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "var(--accent-gold)",
  marginBottom: 14,
} as const;

/** Style tab: metals, faceted gemstones, style tips, and the hair color guide. */
export default function StyleTab({
  data,
  seasonName,
}: {
  data: AnalysisResult;
  seasonName: string;
}) {
  const t = useT();
  const palette = data.palette;
  const jewelry = data.jewelry;
  const hairColor = data.hairColor;
  const guide = getSeasonBeautyGuide(seasonName);
  const hairShades = getHairShadesForSeason(seasonName);
  const hairSubtitle = getHairSubtitle(seasonName);

  const rec = (palette.metals?.best || []).map((m: string) => m.toLowerCase());
  const isRecommended = (metal: string) => {
    const file = METAL_FILE_MAP[metal.toLowerCase()];
    return rec.includes(metal.toLowerCase()) || rec.some((r: string) => METAL_FILE_MAP[r] === file);
  };
  const yourMetals = ALL_METALS.filter(isRecommended);
  const notYourMetals = ALL_METALS.filter((m) => !isRecommended(m));

  return (
    <div className="animate-slide-up space-y-6">
      <div id="section-jewelry">
        {jewelry && (
          <div
            className="animate-slide-up rounded-2xl p-6"
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
              key="style-heading"
              text={t("results.style.title")}
              className="text-3xl font-bold"
              tag="h2"
              delay={30}
              duration={0.5}
            />

            {/* ── Metals — yours vs not yours ── */}
            <EditorialSection title={t("results.style.metalsTitle")} direction={t("results.style.metalsBody")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {yourMetals.length > 0 && (
                  <div>
                    <p style={groupLabelStyle}>{t("results.style.yourMetals")}</p>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {yourMetals.map((metal) => (
                        <MetalCircle
                          key={metal}
                          metal={METAL_FILE_MAP[metal.toLowerCase()] as "rose-gold" | "silver" | "gold"}
                          recommended
                        />
                      ))}
                    </div>
                  </div>
                )}
                {notYourMetals.length > 0 && (
                  <div>
                    <p style={{ ...groupLabelStyle, color: "var(--text-muted)" }}>{t("results.style.notYours")}</p>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                      {notYourMetals.map((metal) => (
                        <div key={metal} className="metal-not-yours">
                          <MetalCircle
                            metal={METAL_FILE_MAP[metal.toLowerCase()] as "rose-gold" | "silver" | "gold"}
                            recommended={false}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </EditorialSection>

            {/* ── Gemstones — faceted SVG stones from the season guide ── */}
            <EditorialSection title={t("results.style.gemsTitle")} direction={t("results.style.gemsBody")}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 28, alignItems: "flex-start" }}>
                {guide.gemstones.map((g) => (
                  <GemFacet key={g.name} gem={g} />
                ))}
              </div>
            </EditorialSection>

            {jewelry.style && (
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
              >
                <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--accent-gold)" }}>
                  {t("results.style.tipsTitle")}
                </p>
                <p className="leading-relaxed text-sm" style={{ color: "var(--text-primary)" }}>
                  {jewelry.style}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="h-px my-10"
        style={{ background: "linear-gradient(90deg, transparent, var(--border-color), transparent)" }}
      />

      {/* ── Hair — existing shade cards under the shared editorial header ── */}
      <div id="section-hair">
        <div
          className="animate-slide-up rounded-2xl p-6"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 36,
          }}
        >
          <EditorialSection title="Hair" direction={hairSubtitle}>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <p style={groupLabelStyle}>{t("results.style.hairRecommended")}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {hairShades.best.map((shade) => (
                    <HairCard key={shade.id} shade={shade} />
                  ))}
                </div>
              </div>

              {hairShades.avoid.length > 0 && (
                <div>
                  <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: 12 }} />
                  <p style={{ ...groupLabelStyle, color: "var(--text-muted)" }}>{t("results.style.hairAvoid")}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {hairShades.avoid.map((shade) => (
                      <HairCard key={shade.id} shade={shade} avoid />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </EditorialSection>

          {/* What we assumed about their hair. Shown always when measurement
              ran, because a reader has no other way to tell whether hair was
              part of the verdict. */}
          {data.measured && (
            <div
              className="rounded-xl p-4 text-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
              }}
            >
              {data.hairAvailable === false
                ? (data.hairNote ?? t("results.style.hairNoteUnavailable"))
                : data.measured.hairStatus === "natural"
                  ? t("results.style.hairNoteNatural")
                  : t("results.style.hairNoteExcluded", {
                      status: t(
                        data.measured.hairStatus === "dyed"
                          ? "results.style.hairStatusDyed"
                          : "results.style.hairStatusCovered"
                      ),
                    })}
            </div>
          )}

          {/* Additional tips from AI analysis */}
          {hairColor && hairColor.bestHighlights && (
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--accent-gold)" }}>
                {t("results.style.hairBestHighlights")}
              </p>
              <p className="leading-relaxed text-sm" style={{ color: "var(--text-primary)" }}>
                {hairColor.bestHighlights}
              </p>
            </div>
          )}
          {hairColor && hairColor.bestOverall && (
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
            >
              <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--accent-gold)" }}>
                {t("results.style.hairOverall")}
              </p>
              <p className="leading-relaxed text-sm" style={{ color: "var(--text-primary)" }}>
                {hairColor.bestOverall}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
