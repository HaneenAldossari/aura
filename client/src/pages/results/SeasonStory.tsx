import type { ColorDNAValues } from "./ColorDNAPanel";
import { useT } from "../../i18n";

/** Season photo + story paragraph. */
export default function SeasonStory({
  seasonName,
  seasonStory,
  colorDNA,
}: {
  seasonName: string;
  seasonStory?: string;
  colorDNA: ColorDNAValues;
}) {
  const t = useT();

  return (
    <section style={{ marginBottom: 80 }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 40,
        alignItems: "start",
      }}>
        {/* Season photo */}
        <div style={{
          width: 280,
          height: 280,
          overflow: "hidden",
          flexShrink: 0,
          position: "relative",
        }}>
          <img loading="lazy" decoding="async"
            src={`/seasons/${seasonName.toLowerCase().includes("winter") ? "winter" : seasonName.toLowerCase().includes("summer") ? "summer" : seasonName.toLowerCase().includes("spring") ? "spring" : "autumn"}.webp`}
            alt={`${seasonName} season`}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.8)",
            }}
          />
          <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(212,175,122,0.2)", pointerEvents: "none" }} />
        </div>
        <div>
          <h2 style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 40,
            fontWeight: 300,
            lineHeight: 1.15,
            color: "#D4AF7A",
            marginBottom: 20,
          }}>
            {t("results.story.title")}
          </h2>
          <p style={{ fontSize: 15, color: "#B8B0A4", lineHeight: 1.8, maxWidth: 520 }}>
            {seasonStory ||
              t("results.story.fallback", {
                season: seasonName,
                temperature: t(colorDNA.temperature > 60 ? "results.story.temperatureWarm" : "results.story.temperatureCool"),
                contrast: t(colorDNA.contrast > 60 ? "results.story.contrastHigh" : "results.story.contrastSoft"),
                depth: t(colorDNA.depth > 60 ? "results.story.depthDeep" : "results.story.depthLight"),
                clarity: t(colorDNA.clarity > 50 ? "results.story.clarityClear" : "results.story.clarityMuted"),
              })}
          </p>
        </div>
      </div>
    </section>
  );
}
