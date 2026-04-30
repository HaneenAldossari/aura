import type { HairShade, HairServiceType } from "../data/hairShadeLibrary";

interface HairCardProps {
  shade: HairShade;
  avoid?: boolean;
}

const SERVICE_STYLES: Record<HairServiceType, { color: string; border: string }> = {
  Highlights:  { color: "var(--accent-gold)", border: "0.5px solid var(--accent-gold)" },
  Balayage:    { color: "var(--text-secondary)", border: "0.5px solid var(--border-color)" },
  Toning:      { color: "var(--text-secondary)", border: "0.5px solid var(--border-color)" },
  "Full Color": { color: "var(--text-muted)", border: "0.5px solid var(--border-color)" },
};

export function HairCard({ shade, avoid = false }: HairCardProps) {
  const tagStyle = SERVICE_STYLES[shade.serviceType];

  return (
    <div
      style={{
        width: 100,
        borderRadius: 8,
        overflow: "hidden",
        border: "0.5px solid var(--border-color)",
        transition: "transform 0.25s ease",
        cursor: "default",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Swatch gradient area */}
      <div
        style={{
          height: 120,
          background: `linear-gradient(180deg, ${shade.gradientTop} 0%, ${shade.gradientMid} 40%, ${shade.gradientBottom} 100%)`,
          position: "relative",
          filter: avoid ? "saturate(0.5) opacity(0.65)" : "none",
        }}
      >
        {/* Shine highlight */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "60%",
            height: "50%",
            background: "radial-gradient(ellipse at 25% 25%, rgba(255,255,255,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Card body */}
      <div style={{ background: "var(--bg-card)", padding: 10 }}>
        <p style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 13,
          color: avoid ? "var(--text-muted)" : "var(--text-primary)",
          lineHeight: 1.3,
          marginBottom: 3,
        }}>
          {shade.name}
        </p>

        <p style={{
          fontFamily: "Cormorant Garamond, serif",
          fontStyle: "italic",
          fontSize: 11,
          color: "var(--text-muted)",
          lineHeight: 1.3,
          marginBottom: 6,
        }}>
          {shade.description}
        </p>

        {/* Service type pill */}
        <span style={{
          display: "inline-block",
          fontSize: 8,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          padding: "2px 6px",
          borderRadius: 9999,
          color: avoid ? "var(--text-muted)" : tagStyle.color,
          border: avoid ? "0.5px solid var(--border-color)" : tagStyle.border,
          lineHeight: 1.4,
        }}>
          {shade.serviceType}
        </span>

        {/* Avoid reason */}
        {avoid && shade.avoidReason && (
          <p style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 10,
            color: "var(--text-muted)",
            lineHeight: 1.3,
            marginTop: 5,
          }}>
            {shade.avoidReason}
          </p>
        )}
      </div>
    </div>
  );
}
