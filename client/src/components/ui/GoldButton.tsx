import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost";
  children: ReactNode;
}

/**
 * The app's CTA button. `solid` = champagne gold fill, `ghost` = gold
 * hairline outline. Both lift on hover.
 */
export default function GoldButton({
  variant = "solid",
  children,
  style,
  className = "",
  ...rest
}: GoldButtonProps) {
  const base =
    variant === "solid"
      ? {
          background: "var(--accent-gold)",
          color: "var(--text-on-accent)",
          border: "1px solid var(--accent-gold)",
        }
      : {
          background: "transparent",
          color: "var(--accent-gold)",
          border: "1px solid var(--border-accent)",
        };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium tracking-wide cursor-pointer ${className}`}
      style={{ fontFamily: "Inter, sans-serif", ...base, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
