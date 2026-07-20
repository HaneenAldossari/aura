interface WearChip {
  name: string;
  hex: string;
}

export interface WearCardConfig {
  title: string;
  description: string;
  chips: WearChip[];
}

/** Single "how to wear" card — title, description, and 3 color chips. */
function WearCard({ title, description, chips }: WearCardConfig) {
  return (
    <div style={{ background: "rgba(32,31,31,0.85)", padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
      <div>
        <h4 style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 22, color: "#D4AF7A", marginBottom: 12 }}>{title}</h4>
        <p style={{ fontSize: 13, color: "#B8B0A4", lineHeight: 1.65, marginBottom: 20 }}>
          {description}
        </p>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {chips.map((c) => (
          <div key={c.hex} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: 40, height: 40, background: c.hex, border: "1px solid rgba(212,175,122,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
            <span style={{ fontSize: 11, color: "#B8B0A4", textAlign: "center", lineHeight: 1.3, maxWidth: 64 }}>{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "How to Wear Your Palette" — 3 parameterized cards. */
export default function HowToWearCards({ cards }: { cards: WearCardConfig[] }) {
  return (
    <section style={{ marginBottom: 80 }}>
      <h3 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 32, fontWeight: 300, color: "#F2EEE8", marginBottom: 24 }}>How to Wear Your Palette</h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 2,
      }}>
        {cards.map((card) => (
          <WearCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
