interface ColorCircleProps {
  hex: string;
  name: string;
  size?: number;
  avoid?: boolean;
  glow?: boolean;
  label?: boolean;
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 180;
}

export function ColorCircle({
  hex,
  name,
  size = 52,
  avoid = false,
  glow = true,
  label = true,
}: ColorCircleProps) {
  return (
    <div
      style={{
        width: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        filter: avoid ? "saturate(0.6) opacity(0.7)" : "none",
        transition: "filter 0.3s ease",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: hex,
          border: isLight(hex) ? "1px solid rgba(196,168,130,0.33)" : "none",
          boxShadow: glow && !avoid ? `0 0 12px 3px ${hex}55` : "none",
          position: "relative",
          overflow: "hidden",
        }}
      />
      {label && (
        <span
          style={{
            display: "block",
            textAlign: "center",
            fontSize: "13px",
            color: avoid ? "var(--text-muted)" : "var(--text-secondary)",
            marginTop: "6px",
            lineHeight: 1.3,
            maxWidth: size + 16,
          }}
        >
          {name}
        </span>
      )}
    </div>
  );
}
