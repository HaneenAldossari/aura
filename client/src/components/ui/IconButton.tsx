import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only buttons must announce themselves */
  "aria-label": string;
  children: ReactNode;
}

/** Icon-only button with an enforced accessible name. */
export default function IconButton({
  children,
  style,
  className = "",
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full cursor-pointer transition hover:opacity-80 ${className}`}
      style={{ background: "transparent", border: "none", color: "inherit", ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
