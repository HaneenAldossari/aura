import type { CSSProperties } from "react";

/**
 * Loading placeholder.
 *
 * A flat panel, not a sweep. The design system allows tap and hover feedback
 * only — an animated shimmer is ambient motion, and ambient motion exists in
 * exactly two places, both on Home.
 */
export default function Skeleton({
  width = "100%",
  height = 16,
  radius = 0,
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
        background: "var(--surface-raised)",
        ...style,
      }}
    />
  );
}
