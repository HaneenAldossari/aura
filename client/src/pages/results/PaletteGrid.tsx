import { useState } from "react";
import type { ColorSwatch, Palette } from "../../lib/types";

/** The 12-color signature palette grid with click-to-copy. */
export default function PaletteGrid({ palette }: { palette: Palette }) {
  const [stripCopied, setStripCopied] = useState<string | null>(null);

  return (
    <section style={{ marginBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 36 }}>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 300, color: "#F2EEE8", margin: 0, whiteSpace: "nowrap" }}>Your Palette</h2>
        <div style={{ flex: 1, height: 0.5, background: "rgba(78,70,57,0.3)" }} />
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#B8B0A4", whiteSpace: "nowrap" }}>
          The 12 Signature Tones
        </span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 1,
        background: "rgba(78,70,57,0.1)",
        padding: 1,
      }}>
        {palette.best
          .filter((c: ColorSwatch, i: number, arr: ColorSwatch[]) => arr.findIndex(x => x.name === c.name) === i)
          .slice(0, 12)
          .map((c: ColorSwatch) => (
            <div
              key={c.hex}
              style={{ position: "relative", aspectRatio: "1", minHeight: 80, overflow: "hidden", cursor: "pointer", background: "#131313", transition: "transform 0.3s ease, zIndex 0s" }}
              onClick={() => {
                navigator.clipboard.writeText(c.hex);
                setStripCopied(c.hex);
                setTimeout(() => setStripCopied(null), 1500);
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "scale(1.08)";
                e.currentTarget.style.zIndex = "10";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.zIndex = "0";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                width: "100%",
                height: "100%",
                background: c.hex,
              }} />
              <div style={{
                position: "absolute",
                inset: 0,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)",
                pointerEvents: "none",
              }}>
                <span style={{
                  fontFamily: "Cormorant Garamond, serif",
                  fontStyle: "italic",
                  fontSize: 15,
                  color: "#F2EEE8",
                  lineHeight: 1.3,
                }}>{c.name}</span>
              </div>
              {stripCopied === c.hex && (
                <div style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  fontSize: 9,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#D4AF7A",
                  background: "rgba(0,0,0,0.75)",
                  padding: "3px 8px",
                  borderRadius: 3,
                  pointerEvents: "none",
                }}>Copied</div>
              )}
            </div>
          ))}
      </div>
    </section>
  );
}
