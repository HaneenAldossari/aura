import type { ColorDNAValues } from "./ColorDNAPanel";

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
          <img
            src={`/seasons/${seasonName.toLowerCase().includes("winter") ? "winter" : seasonName.toLowerCase().includes("summer") ? "summer" : seasonName.toLowerCase().includes("spring") ? "spring" : "autumn"}.png`}
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
            Your Season Story
          </h2>
          <p style={{ fontSize: 15, color: "#B8B0A4", lineHeight: 1.8, maxWidth: 520 }}>
            {seasonStory || `As a ${seasonName}, your coloring reflects ${colorDNA.temperature > 60 ? "warmth and richness" : "coolness and clarity"}. Your features carry a ${colorDNA.contrast > 60 ? "high-contrast" : "soft"} quality with ${colorDNA.depth > 60 ? "deep" : "light"}, ${colorDNA.clarity > 50 ? "clear" : "muted"} tones that define your unique palette. The colours chosen for you enhance your natural harmony and bring out your best features.`}
          </p>
        </div>
      </div>
    </section>
  );
}
