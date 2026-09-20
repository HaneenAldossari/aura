import { useT } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";

/**
 * Metals, neutrals and what to avoid, as definition rows.
 *
 * Every value is read from the result — the metals and neutrals come from the
 * canonical palette, the hair lines from the model. A row with nothing behind
 * it is omitted rather than rendered empty, because an empty "Avoid metals"
 * reads as "none to avoid", which is a different claim.
 */
export default function StyleSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const palette = data.palette;

  const rows = [
    { key: "metals", label: t("results.styleSection.metals"), value: palette?.metals?.best?.join(", ") },
    { key: "neutrals", label: t("results.styleSection.neutrals"), value: palette?.neutrals?.join(", ") },
    { key: "gems", label: t("results.styleSection.gemstones"), value: data.gemstones?.map((g) => g.name).join(", ") },
    { key: "hair", label: t("results.styleSection.hair"), value: data.hairColor?.bestOverall },
    { key: "avoidMetals", label: t("results.styleSection.avoidMetals"), value: palette?.metals?.avoid?.join(", ") },
    { key: "avoid", label: t("results.styleSection.avoid"), value: palette?.avoid?.map((c) => c.name).join(", ") },
  ].filter((r) => r.value && r.value.trim().length > 0);

  if (rows.length === 0) return null;

  return (
    <section className="ed-section" aria-labelledby="style-label">
      <h2 className="ed-section__label" id="style-label">
        {t("results.styleSection.title")}
      </h2>
      <hr className="ed-rule" />
      <dl className="ed-defs">
        {rows.map((row) => (
          <div className="ed-def" key={row.key}>
            <dt className="ed-def__term">{row.label}</dt>
            <dd className="ed-def__value" style={{ margin: 0 }}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
