function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 180;
}

interface NailSwatchProps {
  hex: string;
  name: string;
  brand?: string;
  description?: string;
  avoid?: boolean;
}

export function NailSwatch({ hex, name, brand, avoid = false }: NailSwatchProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
      <div
        style={{
          width: "36px",
          height: "52px",
          background: hex,
          borderRadius: "18px 18px 6px 6px",
          border: isLight(hex) ? "1px solid rgba(196,168,130,0.4)" : "1px solid transparent",
          boxShadow: `0 0 10px 2px ${hex}44`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Nail shine highlight */}
        <div
          style={{
            position: "absolute",
            top: "6px",
            left: "6px",
            width: "8px",
            height: "14px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "50%",
            transform: "rotate(-20deg)",
          }}
        />
        {avoid && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "130%", height: "2px", background: "#FF3333", transform: "rotate(-45deg)", position: "absolute" }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        {brand && <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>{brand}</p>}
        <span style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "56px", display: "block" }}>{name}</span>
      </div>
    </div>
  );
}
