import { getDescriptors } from "./seasonDescriptors";

/** Resolved DNA values (AI-returned, with neutral fallbacks). */
export type ColorDNAValues = {
  temperature: number;
  depth: number;
  clarity: number;
  contrast: number;
};

/** Color Analysis card: feature list (left) + DNA horizontal bars (right). */
export default function ColorDNAPanel({
  seasonName,
  colorDNA,
}: {
  seasonName: string;
  colorDNA: ColorDNAValues;
}) {
  return (
    <section style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 48,
      marginBottom: 80,
      alignItems: "start",
    }}>
      {/* Left: Feature List */}
      <div>
        <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 28, color: "#F2EEE8", marginBottom: 8 }}>Your Colour Analysis</h3>
        <p style={{ fontSize: 14, color: "#B8B0A4", lineHeight: 1.6, marginBottom: 28 }}>
          Our AI analysis has mapped your physical traits to the frequency of {seasonName}. Your features possess a {colorDNA.depth > 60 ? "grounded, majestic depth" : "soft, luminous quality"}.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {(() => {
            const desc = getDescriptors(seasonName);
            return [
              { label: "Skin Undertone", value: desc.undertone },
              { label: "Hair", value: desc.hair },
              { label: "Eyes", value: desc.eyes },
              { label: "Contrast", value: desc.contrast },
            ];
          })().filter(r => r.value).map((row, i, arr) => (
            <div key={row.label} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(78,70,57,0.15)" : "none",
              gap: 16,
            }}>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "#D4AF7A", fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 17, color: "#F2EEE8", textAlign: "right", lineHeight: 1.3 }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: DNA Horizontal Bars */}
      <div style={{
        background: "rgba(32,31,31,0.8)",
        padding: "32px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          bottom: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,175,122,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, color: "#F2EEE8", textAlign: "center", marginBottom: 36 }}>Color DNA Analysis</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative", zIndex: 1 }}>
          {[
            { low: "Cool", high: "Warm", value: colorDNA.temperature },
            { low: "Light", high: "Deep", value: colorDNA.depth },
            { low: "Muted", high: "Clear", value: colorDNA.clarity },
            { low: "Low", high: "High", value: colorDNA.contrast },
          ].map(({ low, high, value }) => (
            <div key={high}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "#B8B0A4", marginBottom: 10 }}>
                <span>{low}</span>
                <span>{high}</span>
              </div>
              <div style={{ height: 2, width: "100%", background: "rgba(78,70,57,0.25)", position: "relative" }}>
                <div style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  height: "100%",
                  width: `${value}%`,
                  background: "#D4AF7A",
                  boxShadow: "0 0 10px rgba(212,175,122,0.5)",
                  transition: "width 1s ease-out",
                }} />
                <div style={{
                  position: "absolute",
                  left: `${value}%`,
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#D4AF7A",
                  boxShadow: "0 0 0 4px rgba(212,175,122,0.1)",
                  transition: "left 1s ease-out",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
