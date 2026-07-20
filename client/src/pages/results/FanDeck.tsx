import { useEffect, useRef, useState } from "react";
import type { ColorSwatch } from "../../lib/types";

interface FanDeckProps {
  colors: ColorSwatch[];
  /** large = signature palette; small = compact strip (e.g. avoid colors) */
  size?: "large" | "small";
}

/**
 * The 12-color palette as a designer's paint-chip fan deck: tall rounded
 * cards fanned in a gentle arc. Hover/focus lifts a card out of the fan and
 * shows its name, hex, and styling note beneath the deck. Click/Enter copies
 * the hex. Collapses to a stacked chip list under 480px.
 */
export default function FanDeck({ colors, size = "large" }: FanDeckProps) {
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 480
  );
  const deckRef = useRef<HTMLDivElement>(null);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Fan-out entrance: cards start collapsed at the center, then transition
  // to their fanned positions with a per-card stagger.
  useEffect(() => {
    if (reducedMotion) {
      setMounted(true);
      return;
    }
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true))
    );
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 480);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const copy = (c: ColorSwatch) => {
    navigator.clipboard.writeText(c.hex);
    setCopied(c.hex);
    setTimeout(() => setCopied(null), 1500);
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = e.key === "ArrowRight" ? i + 1 : i - 1;
      const cards = deckRef.current?.querySelectorAll<HTMLButtonElement>("[data-fan-card]");
      cards?.[Math.max(0, Math.min(colors.length - 1, next))]?.focus();
    }
    // Enter/Space activate the button natively → onClick copies
  };

  const activeColor = active !== null ? colors[active] : null;

  const large = size === "large";
  const cardW = large ? 88 : 56;
  const cardH = large ? 190 : 110;
  const overlap = large ? 30 : 20;
  const anglePer = large ? 4.2 : 5;
  const mid = (colors.length - 1) / 2;

  // ── Mobile: stacked chip list ──
  if (isNarrow) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {colors.map((c) => (
          <button
            key={c.hex + c.name}
            onClick={() => copy(c)}
            aria-label={`Copy ${c.name} ${c.hex}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 14px",
              minHeight: 44,
              borderRadius: 12,
              background: "var(--bg-card)",
              border: "1px solid var(--border-color)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 44,
                height: 30,
                borderRadius: 8,
                background: c.hex,
                flexShrink: 0,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 16, color: "var(--text-primary)" }}>
                {c.name}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {copied === c.hex ? "Copied ✓" : c.hex}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  // ── Desktop: the fan ──
  return (
    <div>
      <div
        ref={deckRef}
        role="group"
        aria-label="Palette colors — arrow keys to browse, Enter to copy"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          height: cardH + (large ? 90 : 50),
          paddingTop: large ? 30 : 16,
        }}
      >
        {colors.map((c, i) => {
          const angle = (i - mid) * anglePer;
          const droop = Math.pow(Math.abs(i - mid), 1.6) * (large ? 3.5 : 2.5);
          const isActive = active === i;
          return (
            <button
              key={c.hex + c.name}
              data-fan-card
              onClick={() => copy(c)}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
              onKeyDown={(e) => onKeyDown(e, i)}
              aria-label={`${c.name} ${c.hex} — press Enter to copy`}
              style={{
                width: cardW,
                height: cardH,
                marginLeft: i === 0 ? 0 : -overlap,
                borderRadius: large ? 14 : 10,
                border: isActive
                  ? "1.5px solid var(--accent-gold)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: c.hex,
                cursor: "pointer",
                position: "relative",
                padding: 0,
                transformOrigin: "bottom center",
                transform: mounted
                  ? isActive
                    ? "translateY(-26px) rotate(0deg) scale(1.06)"
                    : `translateY(${droop}px) rotate(${angle}deg)`
                  : "translateY(30px) rotate(0deg)",
                opacity: mounted ? 1 : 0,
                zIndex: isActive ? 20 : i < mid ? i : colors.length - i,
                boxShadow: isActive
                  ? "var(--shadow-glow), 0 12px 32px rgba(0,0,0,0.55)"
                  : "0 4px 14px rgba(0,0,0,0.35)",
                transition: reducedMotion
                  ? "none"
                  : "transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.4s ease",
                transitionDelay: mounted && !isActive ? "0s" : `${i * 40}ms`,
              }}
            >
              {/* paint-chip notch line, like a real fan deck card */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: large ? 12 : 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: large ? 26 : 18,
                  height: 2,
                  borderRadius: 1,
                  background: "rgba(255,255,255,0.35)",
                  mixBlendMode: "overlay",
                }}
              />
              {copied === c.hex && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 9,
                    fontFamily: "Inter, sans-serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--accent-gold)",
                    background: "rgba(0,0,0,0.78)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  Copied
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detail caption — updates with the lifted card (also announces for AT) */}
      <div
        aria-live="polite"
        style={{
          textAlign: "center",
          minHeight: large ? 64 : 48,
          marginTop: large ? 18 : 10,
          transition: "opacity 0.25s ease",
          opacity: activeColor ? 1 : 0.45,
        }}
      >
        {activeColor ? (
          <>
            <div style={{ display: "inline-flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: large ? 22 : 17, color: "var(--text-primary)" }}>
                {activeColor.name}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-gold)" }}>
                {copied === activeColor.hex ? "Copied ✓" : activeColor.hex}
              </span>
            </div>
            {large && (activeColor.note || activeColor.reason) && (
              <p style={{ fontFamily: "Cormorant Garamond, serif", fontStyle: "italic", fontSize: 15, color: "var(--text-secondary)", margin: "6px auto 0", maxWidth: 420, lineHeight: 1.5 }}>
                {activeColor.note || activeColor.reason}
              </p>
            )}
          </>
        ) : (
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Hover a card · click to copy
          </span>
        )}
      </div>
    </div>
  );
}
