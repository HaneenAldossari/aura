import type { CSSProperties } from "react";

/** Loading placeholder with a soft gold shimmer sweep. */
export default function Skeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: "var(--bg-card-subtle)",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, transparent 20%, rgba(212,175,122,0.08) 50%, transparent 80%)",
          animation: "skeleton-sweep 1.6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
