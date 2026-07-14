import { getHairImagePath } from "../utils/hairColorImage";

interface HairCircleProps {
  name: string;
  size?: number;
}

export function HairCircle({ name, size = 64 }: HairCircleProps) {
  const src = getHairImagePath(name);

  // If no image exists for this color name, don't render anything
  if (!src) return null;

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
          borderRadius: "50%",
          overflow: "hidden",
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.6))",
          transition: "transform 0.3s ease, filter 0.3s ease",
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px) scale(1.06)";
          (e.currentTarget as HTMLDivElement).style.filter =
            "drop-shadow(0 10px 20px rgba(212,175,122,0.25))";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0) scale(1)";
          (e.currentTarget as HTMLDivElement).style.filter =
            "drop-shadow(0 6px 14px rgba(0,0,0,0.6))";
        }}
      >
        <img
          src={src}
          alt={name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <span style={{
        fontSize: "13px",
        color: "var(--text-secondary)",
        textAlign: "center",
        maxWidth: `${size + 16}px`,
        lineHeight: 1.3,
        textTransform: "capitalize",
      }}>
        {name}
      </span>
    </div>
  );
}
