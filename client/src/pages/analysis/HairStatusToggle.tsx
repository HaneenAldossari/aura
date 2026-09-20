import type { HairStatus } from "../../lib/types";
import { useT, type Key } from "../../i18n";

/**
 * Asked before analysis, because dyed or covered hair carries no information
 * about natural colouring. Getting this wrong is not a small error: hair is a
 * large share of the value and chroma axes, so treating box-dye as natural
 * shifts the season.
 *
 * Prominent rather than tucked away, and defaulted to "natural" only because it
 * is the commonest case — not because it is safe to leave unread.
 */
const OPTIONS: { value: HairStatus; labelKey: Key; hintKey: Key }[] = [
  { value: "natural", labelKey: "analysis.hair.naturalLabel", hintKey: "analysis.hair.naturalHint" },
  { value: "dyed", labelKey: "analysis.hair.dyedLabel", hintKey: "analysis.hair.dyedHint" },
  { value: "covered", labelKey: "analysis.hair.coveredLabel", hintKey: "analysis.hair.coveredHint" },
];

export default function HairStatusToggle({
  value,
  onChange,
}: {
  value: HairStatus;
  onChange: (next: HairStatus) => void;
}) {
  const t = useT();

  return (
    <fieldset className="mt-6">
      <legend className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
        {t("analysis.hair.legend")}
      </legend>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        {t("analysis.hair.note")}
      </p>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("analysis.hair.groupLabel")}>
        {OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className="rounded-xl px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{
                background: selected ? "var(--accent-gold-soft, rgba(197,160,89,0.14))" : "var(--bg-card)",
                border: `1px solid ${selected ? "var(--accent-gold)" : "var(--border-color)"}`,
              }}
            >
              <span
                className="block text-sm font-medium"
                style={{ color: selected ? "var(--accent-gold)" : "var(--text-primary)" }}
              >
                {t(option.labelKey)}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {t(option.hintKey)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
