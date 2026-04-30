const METAL_LABELS: Record<string, string> = {
  "rose-gold": "Rose Gold",
  "silver": "Silver",
  "gold": "Gold",
};

interface MetalCircleProps {
  metal: "rose-gold" | "silver" | "gold";
  recommended: boolean;
  size?: number;
}

export const ALL_METALS = ["Rose Gold", "Silver", "Gold"] as const;

export const METAL_FILE_MAP: Record<string, string> = {
  "rose gold": "rose-gold",
  "silver": "silver",
  "gold": "gold",
  "yellow gold": "gold",
  "platinum": "silver",
  "white gold": "silver",
  "copper": "rose-gold",
  "bronze": "gold",
};

export function MetalCircle({ metal, recommended, size = 52 }: MetalCircleProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      opacity: recommended ? 1 : 0.55,
    }}>
      <img
        src={`/makeup/metals/${metal}.png`}
        alt={METAL_LABELS[metal]}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
        }}
      />
      <span style={{
        fontSize: "12px",
        color: "var(--text-secondary)",
        fontWeight: 500,
      }}>
        {METAL_LABELS[metal]}
      </span>
      {!recommended && (
        <span style={{
          fontSize: "13px",
          color: "#706860",
          lineHeight: 1,
        }}>
          not ideal
        </span>
      )}
    </div>
  );
}
