import { useT, type Key } from "../../i18n";
import type { HairStatus } from "../../lib/types";

/**
 * Asked before analysis, because dyed or covered hair carries no information
 * about natural colouring.
 *
 * Not a small question: hair is a quarter of the chroma axis, so treating box
 * dye as natural moves the season. The demo faces proved it — counted, their
 * near-black synthetic hair pushed a light-skinned face to Deep Autumn; left
 * out, the same pixels read Light Spring.
 */
const OPTIONS: { value: HairStatus; labelKey: Key }[] = [
  { value: "natural", labelKey: "analysis.hair.naturalLabel" },
  { value: "dyed", labelKey: "analysis.hair.dyedLabel" },
  { value: "covered", labelKey: "analysis.hair.coveredLabel" },
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
    <fieldset className="an-hair">
      <legend className="an-hair__legend">{t("analysis.hairLegend")}</legend>
      <div className="an-hair__options" role="radiogroup" aria-label={t("analysis.hair.groupLabel")}>
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className="an-hair__option"
            onClick={() => onChange(option.value)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>
      <p className="an-hair__note">{t("analysis.hairNote")}</p>
    </fieldset>
  );
}
