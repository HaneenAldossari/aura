import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DrapeWall.css";

/* ─── The Drape Wall ───
   Recreates the color-analysis studio moment: fabric drapes hanging
   from a gold rail — the right one makes your face light up. */

type Season = {
  name: "Spring" | "Summer" | "Autumn" | "Winter";
  colors: string[]; // signature family hexes, top → bottom of the drape
  dominant: string; // used for the background tint wash
  caption: string; // headline hook when focused
};

const SEASONS: Season[] = [
  {
    name: "Spring",
    colors: ["#DB8768", "#E3C36F", "#93A860"], // coral / warm yellow / fresh green
    dominant: "#DB8768",
    caption: "Spring freshens you.",
  },
  {
    name: "Summer",
    colors: ["#C49AA2", "#7A8BA3", "#A38EA9"], // dusty rose / slate blue / soft mauve
    dominant: "#7A8BA3",
    caption: "Summer softens you.",
  },
  {
    name: "Autumn",
    colors: ["#A85A38", "#77713F", "#B08542"], // rust / olive / gold-brown
    dominant: "#A85A38",
    caption: "Autumn warms you.",
  },
  {
    name: "Winter",
    colors: ["#A9C1D6", "#26365A", "#77294B", "#141419"], // icy blue / navy / berry / black
    dominant: "#77294B",
    caption: "Winter sharpens you.",
  },
];

/* Vertical sheen + soft inner folds layered over the season gradient */
const SHEEN =
  "linear-gradient(100deg, transparent 32%, rgba(255,255,255,0.10) 47%, transparent 60%)";
const FOLDS =
  "repeating-linear-gradient(90deg, rgba(0,0,0,0.09) 0px, rgba(0,0,0,0.09) 2px, rgba(255,255,255,0.03) 9px, transparent 15px, transparent 24px)";

function clothBackground(colors: string[]) {
  const stops = colors
    .map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`)
    .join(", ");
  return `${SHEEN}, ${FOLDS}, linear-gradient(168deg, ${stops})`;
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/* Staggered idle-sway phases (duration s, negative delay s) */
const SWAY: Array<[number, number]> = [
  [6.2, -1.1],
  [7.4, -3.3],
  [6.8, -5.2],
  [7.9, -2.2],
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function DrapeWall() {
  const navigate = useNavigate();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [autoIndex, setAutoIndex] = useState<number | null>(null);

  const autoCycle = isDesktop && !reducedMotion;

  useEffect(() => {
    if (!autoCycle) {
      setAutoIndex(null);
      return;
    }
    if (hoverIndex !== null) return; // pause while the visitor explores
    const id = window.setInterval(() => {
      setAutoIndex((i) => (i === null ? 0 : (i + 1) % SEASONS.length));
    }, 3500);
    return () => window.clearInterval(id);
  }, [autoCycle, hoverIndex]);

  const active = hoverIndex !== null ? hoverIndex : autoIndex;

  return (
    <div className="drape-wall">
      {/* Background wash of the focused drape's dominant color */}
      {SEASONS.map((s, i) => (
        <div
          key={s.name}
          aria-hidden="true"
          className={`drape-wall__tint${active === i ? " drape-wall__tint--on" : ""}`}
          style={{
            background: `radial-gradient(closest-side, ${hexToRgba(s.dominant, 0.12)}, transparent 72%)`,
          }}
        />
      ))}

      <p
        aria-live="polite"
        className={`drape-wall__caption${active !== null ? " drape-wall__caption--focused" : ""}`}
      >
        {active !== null ? SEASONS[active].caption : "Which one wakes up your face?"}
      </p>

      <div className="drape-wall__scroller">
        <div className="drape-wall__track">
          <span className="drape-wall__rail" aria-hidden="true" />
          {SEASONS.map((s, i) => {
            const classes = [
              "drape",
              active === i ? "drape--focused" : "",
              active !== null && active !== i ? "drape--dimmed" : "",
              reducedMotion ? "drape--static" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const [dur, delay] = SWAY[i];
            return (
              <button
                key={s.name}
                type="button"
                className={classes}
                aria-label={`See your ${s.name} palette — start analysis`}
                style={
                  reducedMotion
                    ? undefined
                    : { animation: `drape-sway ${dur}s ease-in-out ${delay}s infinite alternate` }
                }
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex(null)}
                onClick={() => navigate("/analyze")}
              >
                <span
                  className="drape__cloth"
                  style={{ background: clothBackground(s.colors) }}
                />
                <span className="drape__label">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
