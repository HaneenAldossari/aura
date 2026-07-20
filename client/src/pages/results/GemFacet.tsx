import type { CSSProperties } from "react";
import type { GemstoneEntry } from "../../data/seasonBeautyGuide";
import "./results-tabs.css";

/** Linear mix of two hex colors, t in [0,1] toward `b`. */
function mix(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) =>
    Math.round(parseInt(pa.slice(i, i + 2), 16) * (1 - t) + parseInt(pb.slice(i, i + 2), 16) * t);
  return `#${[ch(0), ch(2), ch(4)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// Elongated hexagonal brilliant cut: outer girdle + inner table, six facets between.
const OUTER = [
  [36, 3],
  [65, 21],
  [65, 51],
  [36, 69],
  [7, 51],
  [7, 21],
] as const;
const TABLE = [
  [36, 21],
  [50, 30],
  [50, 42],
  [36, 51],
  [22, 42],
  [22, 30],
] as const;

const pts = (list: ReadonlyArray<readonly [number, number] | readonly number[]>) =>
  list.map((p) => p.join(",")).join(" ");

/**
 * GemFacet — an SVG faceted gem replacing photo gemstone cards. Six polygon
 * facets alternate between the stone's body color, its accent, and low-opacity
 * mixes with white/black, plus a specular white glint. Name set below in
 * Cormorant italic; hover rotates the stone and adds a glow.
 */
export default function GemFacet({ gem, size = 72 }: { gem: GemstoneEntry; size?: number }) {
  const { hex, accent } = gem;
  const facetFills = [
    accent,
    mix(hex, "#000000", 0.28),
    hex,
    mix(accent, "#000000", 0.2),
    hex,
    mix(hex, "#FFFFFF", 0.3),
  ];

  return (
    <div
      className="gem-facet"
      role="img"
      aria-label={`${gem.name} gemstone`}
      style={{ "--gem-glow": `${hex}66` } as CSSProperties}
    >
      <svg width={size} height={size} viewBox="0 0 72 72" aria-hidden="true">
        {/* Six facets from girdle to table */}
        {OUTER.map((o, i) => {
          const o2 = OUTER[(i + 1) % 6];
          const t2 = TABLE[(i + 1) % 6];
          const t1 = TABLE[i];
          return (
            <polygon
              key={i}
              points={pts([o, o2, t2, t1])}
              fill={facetFills[i]}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={0.5}
            />
          );
        })}
        {/* Table */}
        <polygon
          points={pts([...TABLE])}
          fill={mix(accent, "#FFFFFF", 0.14)}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={0.5}
        />
        {/* Low-opacity depth wash across the pavilion side */}
        <polygon points={pts([OUTER[2], OUTER[3], TABLE[3], TABLE[2]])} fill="#000000" opacity={0.14} />
        {/* Specular glint */}
        <polygon points="26,12 41,8 30,23" fill="#FFFFFF" opacity={0.65} />
      </svg>
      <span
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontStyle: "italic",
          fontSize: 15,
          color: "var(--text-secondary)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {gem.name}
      </span>
    </div>
  );
}
