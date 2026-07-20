import { Fragment } from "react";
import { MakeupSwatch } from "../../components/MakeupSwatch";

type MakeupCategory = "foundation" | "lips" | "blush" | "bronzer" | "eyeshadow" | "nails";

export interface SwatchGroup {
  /** Sub-label above the row ("Recommended Shades", "Everyday", "Colours to Avoid"...) */
  label?: string;
  swatches: Array<{ name: string; hex?: string }>;
  /** Render swatches faded/struck as shades to avoid */
  avoid?: boolean;
  /** Gold hairline above the label */
  divider?: boolean;
  /** Extra top margin on the divider (bronzer uses "16px") */
  dividerMarginTop?: string;
  /** Skip the group entirely when it has no swatches */
  hideWhenEmpty?: boolean;
}

/**
 * One makeup category block (foundation / blush / bronzer / lips / eyes),
 * config-driven: heading, optional subtitle, swatch groups, optional tip.
 */
export default function MakeupSection({
  title,
  subtitle,
  category,
  gapClass = "gap-5",
  groups,
  tip,
}: {
  title: string;
  subtitle?: string;
  category: MakeupCategory;
  /** Tailwind gap class for the swatch rows (foundation uses "gap-4") */
  gapClass?: string;
  groups: SwatchGroup[];
  tip?: string;
}) {
  const heading = (
    <h3 className="text-xl font-semibold" style={{ fontFamily: "Cormorant Garamond, serif", color: 'var(--text-primary)' }}>{title}</h3>
  );

  return (
    <div className="space-y-4">
      {subtitle ? (
        <div>
          {heading}
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
      ) : (
        heading
      )}
      {groups.map((g, i) => {
        if (g.hideWhenEmpty && g.swatches.length === 0) return null;
        const row = (
          <div className={`flex flex-wrap ${gapClass}`}>
            {g.swatches.map((s) => (
              <MakeupSwatch key={s.name} category={category} name={s.name} hex={s.hex} size={52} avoid={g.avoid} />
            ))}
          </div>
        );
        if (!g.label && !g.divider) return <Fragment key={i}>{row}</Fragment>;
        return (
          <div key={i}>
            {g.divider && (
              <div style={{ height: "0.5px", background: "var(--accent-gold)", opacity: 0.4, marginBottom: "12px", ...(g.dividerMarginTop ? { marginTop: g.dividerMarginTop } : {}) }} />
            )}
            {g.label && (
              <p className="text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--accent-gold)' }}>{g.label}</p>
            )}
            {row}
          </div>
        );
      })}
      {tip && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip}</p>}
    </div>
  );
}
