const METAL_GRADIENTS: Record<string, string> = {
  "silver": "linear-gradient(135deg, #e8e8e8 0%, #a8a8a8 40%, #d4d4d4 60%, #c0c0c0 100%)",
  "platinum": "linear-gradient(135deg, #f0eeee 0%, #b8b4b4 40%, #e5e4e2 60%, #d0cccc 100%)",
  "white gold": "linear-gradient(135deg, #f5f3e8 0%, #c8c4a0 40%, #e8e4c8 60%, #d4d0a8 100%)",
  "yellow gold": "linear-gradient(135deg, #f5d878 0%, #c8a830 40%, #e8c84a 60%, #cfb53b 100%)",
  "gold": "linear-gradient(135deg, #f5d878 0%, #c8a830 40%, #e8c84a 60%, #cfb53b 100%)",
  "rose gold": "linear-gradient(135deg, #f0c4b4 0%, #c07860 40%, #e0a890 60%, #b87060 100%)",
  "copper": "linear-gradient(135deg, #d4906c 0%, #a05030 40%, #c07040 60%, #b87333 100%)",
  "bronze": "linear-gradient(135deg, #d4a060 0%, #a07030 40%, #c08040 60%, #cd7f32 100%)",
};

interface MetalBarProps {
  name: string;
  recommended?: boolean;
}

export function MetalBar({ name, recommended = true }: MetalBarProps) {
  const gradient = METAL_GRADIENTS[name.toLowerCase()] ?? METAL_GRADIENTS["silver"];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderRadius: "12px",
        background: gradient,
        marginBottom: "8px",
        minHeight: "52px",
        opacity: recommended ? 1 : 0.5,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-on-accent)" }}>
        {name}
      </span>
      <span style={{ fontSize: "13px", fontWeight: 600, color: recommended ? "#1A6632" : "#882222" }}>
        {recommended ? "\u2713 Suits you" : "\u2717 Avoid"}
      </span>
    </div>
  );
}
