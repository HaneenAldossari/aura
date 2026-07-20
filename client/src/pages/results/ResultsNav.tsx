import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { Palette } from "../../lib/types";

export type Tab = "overview" | "beauty" | "style" | "shop";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "beauty", label: "Beauty" },
  { key: "style", label: "Style" },
  { key: "shop", label: "Shop" },
];

/**
 * Fixed top nav (back button + tab bar) plus the season context banner
 * shown on non-overview tabs. The active-tab underline is a single gold
 * hairline that slides between tabs.
 *
 * Note: intentionally NOT NavShell — Results' nav has a second (tab bar)
 * row inside the <nav>, and its background (rgba(15,10,5,0.92)) differs
 * from the shared `glass-dark` class (rgba(13,13,15,0.92)).
 */
export default function ResultsNav({
  tab,
  onTabChange,
  seasonName,
  palette,
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  seasonName: string;
  palette: Palette | undefined;
}) {
  const navigate = useNavigate();
  const rowRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const el = row.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`);
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onTabChange(next.key);
    rowRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${next.key}"]`)
      ?.focus();
  };

  return (
    <>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50" style={{ background: 'rgba(15,10,5,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 transition cursor-pointer" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Home</span>
          </button>
        </div>
        <div className="nav-scroll-container max-w-5xl mx-auto px-6 pb-2 relative">
          <div className="overflow-x-auto nav-scroll">
            <div ref={rowRef} role="tablist" aria-label="Result sections" className="flex gap-1 relative">
              {tabs.map((t, i) => (
                <button
                  key={t.key}
                  data-tab={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  tabIndex={tab === t.key ? 0 : -1}
                  onClick={() => onTabChange(t.key)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className="whitespace-nowrap transition cursor-pointer"
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: tab === t.key ? "var(--accent-gold)" : "var(--text-muted)",
                    background: "none",
                    border: "none",
                    padding: "6px 12px",
                  }}
                >
                  {t.label}
                </button>
              ))}
              {/* sliding gold hairline */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: indicator.left,
                  width: indicator.width,
                  height: 1,
                  background: "var(--accent-gold)",
                  transition: "left 0.3s cubic-bezier(0.22,1,0.36,1), width 0.3s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Season context banner for non-overview tabs */}
      {tab !== "overview" && (
        <div className="fixed w-full z-40" style={{ top: "88px", background: "var(--bg-primary)", borderBottom: "0.5px solid var(--border-color)", padding: "8px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }} className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: palette?.best?.[0]?.hex || "var(--accent-gold)", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--text-muted)" }}>
              Showing results for {seasonName}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
