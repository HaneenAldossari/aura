import type { ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";

/** Wraps a section so it fades up when scrolled into view. */
export default function Reveal({
  children,
  delayMs = 0,
}: {
  children: ReactNode;
  delayMs?: number;
}) {
  const ref = useReveal<HTMLDivElement>(delayMs);
  return <div ref={ref}>{children}</div>;
}
