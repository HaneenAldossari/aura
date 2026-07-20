import type { ColorSwatch, Palette } from "../../lib/types";
import FanDeck from "./FanDeck";

/** The 12-color signature palette, presented as a paint-chip fan deck. */
export default function PaletteGrid({ palette }: { palette: Palette }) {
  const colors = palette.best
    .filter(
      (c: ColorSwatch, i: number, arr: ColorSwatch[]) =>
        arr.findIndex((x) => x.name === c.name) === i
    )
    .slice(0, 12);

  return (
    <section style={{ marginBottom: 80 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 36, fontWeight: 300, color: "#F2EEE8", margin: 0, whiteSpace: "nowrap" }}>Your Palette</h2>
        <div style={{ flex: 1, height: 0.5, background: "rgba(78,70,57,0.3)" }} />
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3em", color: "#B8B0A4", whiteSpace: "nowrap" }}>
          The 12 Signature Tones
        </span>
      </div>
      <FanDeck colors={colors} />
    </section>
  );
}
