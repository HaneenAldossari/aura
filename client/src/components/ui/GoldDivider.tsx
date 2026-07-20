/** Hairline divider with a centered gold diamond. */
export default function GoldDivider({ width = 220 }: { width?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        justifyContent: "center",
        width,
        maxWidth: "60vw",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          flex: 1,
          height: 1,
          background:
            "linear-gradient(to right, transparent, var(--accent-gold-dim))",
        }}
      />
      <div
        style={{
          width: 5,
          height: 5,
          background: "var(--accent-gold)",
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          flex: 1,
          height: 1,
          background:
            "linear-gradient(to left, transparent, var(--accent-gold-dim))",
        }}
      />
    </div>
  );
}
