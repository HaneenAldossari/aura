import type { ReactNode } from "react";

/**
 * Fixed glass-dark top bar used by every page. Pages supply their own
 * left/right content (brand, back button, tabs, CTAs).
 */
export default function NavShell({
  left,
  right,
  maxWidth = "max-w-5xl",
  children,
}: {
  left?: ReactNode;
  right?: ReactNode;
  maxWidth?: string;
  children?: ReactNode;
}) {
  return (
    <nav className="fixed top-0 w-full z-50 glass-dark">
      <div
        className={`${maxWidth} mx-auto px-6 py-3 flex items-center justify-between gap-4`}
      >
        {children ?? (
          <>
            {left}
            {right}
          </>
        )}
      </div>
    </nav>
  );
}
