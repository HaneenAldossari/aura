import type { HairStatus } from "../../lib/types";

/**
 * Asked before analysis, because dyed or covered hair carries no information
 * about natural colouring. Getting this wrong is not a small error: hair is a
 * large share of the value and chroma axes, so treating box-dye as natural
 * shifts the season.
 *
 * Prominent rather than tucked away, and defaulted to "natural" only because it
 * is the commonest case — not because it is safe to leave unread.
 */
const OPTIONS: { value: HairStatus; label: string; hint: string }[] = [
  { value: "natural", label: "Natural", hint: "Never coloured, or grown out" },
  { value: "dyed", label: "Coloured", hint: "Dyed, highlighted or toned" },
  { value: "covered", label: "Not visible", hint: "Covered, or out of frame" },
];

export default function HairStatusToggle({
  value,
  onChange,
}: {
  value: HairStatus;
  onChange: (next: HairStatus) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm mb-1" style={{ color: "var(--text-primary)" }}>
        Is your hair its natural colour?
      </legend>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
        Coloured hair tells us nothing about your natural colouring, so we leave it out.
      </p>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Hair colour status">
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
                {option.label}
              </span>
              <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
