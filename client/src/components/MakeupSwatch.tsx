import { getMakeupSwatchImage } from "../utils/makeupSwatchImage";

type MakeupCategory = "foundation" | "lips" | "blush" | "bronzer" | "eyeshadow" | "nails";

interface MakeupSwatchProps {
  category: MakeupCategory;
  name: string;
  hex?: string;
  size?: number;
  avoid?: boolean;
  label?: boolean;
}

export function MakeupSwatch({
  category,
  name,
  hex = "#888888",
  size = 52,
  avoid = false,
  label = true,
}: MakeupSwatchProps) {
  const src = getMakeupSwatchImage(category, name);
  const isNail = category === "nails";

  const width  = isNail ? Math.round(size * 0.62) : size;
  const height = size;
  const borderRadius = isNail
    ? `${Math.round(size * 0.32)}px ${Math.round(size * 0.32)}px ${Math.round(size * 0.22)}px ${Math.round(size * 0.22)}px`
    : "50%";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      filter: avoid ? "saturate(0.6) opacity(0.7)" : "none",
      transition: "filter 0.3s ease",
    }}>
      <div
        style={{
          width,
          height,
          position: "relative",
          borderRadius,
          overflow: isNail ? "visible" : "hidden",
          filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))",
          flexShrink: 0,
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              borderRadius: isNail ? "inherit" : "50%",
            }}
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
              if (el.parentElement) {
                el.parentElement.style.background = hex;
                el.parentElement.style.borderRadius = borderRadius as string;
                const missLabel = document.createElement("span");
                missLabel.textContent = "shade not in library";
                missLabel.style.cssText = "position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);font-size:10px;font-style:italic;color:var(--text-muted);white-space:nowrap;";
                el.parentElement.style.position = "relative";
                el.parentElement.appendChild(missLabel);
              }
            }}
          />
        ) : (
          <>
            <div style={{
              width: "100%",
              height: "100%",
              background: hex,
              borderRadius,
            }} />
            <span style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: "10px", fontStyle: "italic", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              shade not in library
            </span>
          </>
        )}
      </div>

      {label && (
        <span style={{
          fontSize: "13px",
          color: avoid ? "var(--text-muted)" : "var(--text-secondary)",
          textAlign: "center",
          maxWidth: `${size + 12}px`,
          lineHeight: 1.3,
          textTransform: "capitalize",
        }}>
          {name}
        </span>
      )}
    </div>
  );
}
