import { getGemstoneImage } from "../utils/gemstoneImage";

interface GemstoneCardProps {
  name: string;
  size?: number;
}

export function GemstoneCard({ name, size = 64 }: GemstoneCardProps) {
  const src = getGemstoneImage(name);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "8px",
    }}>
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
          transition: "transform 0.3s ease, filter 0.3s ease",
          cursor: "default",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px) scale(1.05)";
          (e.currentTarget as HTMLDivElement).style.filter =
            "drop-shadow(0 6px 16px rgba(212,175,122,0.35))";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
          (e.currentTarget as HTMLDivElement).style.filter =
            "drop-shadow(0 4px 12px rgba(0,0,0,0.5))";
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div style={{
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: "50%",
            background: "var(--border-color)",
            border: "1px solid #C4A882",
          }} />
        )}
      </div>
      <span style={{
        fontSize: "10px",
        color: "var(--text-muted)",
        textAlign: "center",
        maxWidth: `${size + 24}px`,
        lineHeight: 1.3,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 500,
      }}>
        {name}
      </span>
    </div>
  );
}
