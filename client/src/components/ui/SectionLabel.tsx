import type { ReactNode } from "react";

/** Uppercase tracked kicker used above section headings. */
export default function SectionLabel({
  children,
  color = "var(--text-muted)",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <p
      style={{
        fontFamily: "Inter, sans-serif",
        fontSize: 11,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}
