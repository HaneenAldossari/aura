import { useEffect, useRef } from "react";

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("revealed");
            observer?.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
  }
  return observer;
}

/**
 * Scroll reveal: returns a ref; the element starts hidden (via .reveal CSS)
 * and fades up once it enters the viewport. One shared IntersectionObserver
 * for the whole app. No-op under prefers-reduced-motion.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  delayMs = 0
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add("reveal");
    if (delayMs) el.style.transitionDelay = `${delayMs}ms`;
    const obs = getObserver();
    obs.observe(el);
    return () => obs.unobserve(el);
  }, [delayMs]);

  return ref;
}
