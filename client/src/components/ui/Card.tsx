import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  children: ReactNode;
}

/** Standard charcoal panel with hairline border. */
export default function Card({
  elevated = false,
  children,
  style,
  className = "",
  ...rest
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: elevated ? "var(--bg-elevated)" : "var(--bg-card)",
        border: "1px solid var(--border-color)",
        boxShadow: elevated ? "var(--shadow-elevated)" : "var(--shadow-card)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
