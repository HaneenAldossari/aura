import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the reader has asked for less motion.
 *
 * CSS can stop an animation, but it cannot stop a canvas loop or decide not to
 * render the duplicate cards a marquee needs — those are decisions made in
 * JavaScript, so the preference has to be readable there too. Live: changing
 * the system setting takes effect without a reload.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const onChange = () => setReduced(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
