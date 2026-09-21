import { useT, type Key } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";
import MeasuredTable from "./MeasuredTable";

/**
 * The four axes, each with the label the measurement actually produced.
 *
 * Values come from `colorDNA` (0-100). The word beside each number is the
 * measured axis label where measurement ran, and the model's own assessment
 * otherwise — never a threshold re-applied here, which would be a third
 * opinion nobody asked for.
 */
const AXES = [
  { key: "warmth", nameKey: "results.dna.warmth" },
  { key: "depth", nameKey: "results.dna.depthAxis" },
  { key: "clarity", nameKey: "results.dna.clarity" },
  { key: "contrast", nameKey: "results.dna.contrastAxis" },
] as const satisfies ReadonlyArray<{ key: string; nameKey: Key }>;

/**
 * One word, lower case.
 *
 * Two sources feed these: the measured axis labels, which are already terse and
 * lower case ("neutral-warm", "soft"), and the model's own assessment, which is
 * free text and arrives as "Medium" or "Deep / high contrast". Printed side by
 * side they look like two different readouts, so everything is flattened to the
 * measured form — first clause only, lower case.
 */
function axisLabel(raw: string | undefined): string {
  if (!raw) return "";
  return raw.split("/")[0].trim().toLowerCase();
}

export default function ColourDNA({ data }: { data: AnalysisResult }) {
  const t = useT();
  const dna = data.colorDNA ?? {};
  const measured = data.measured;

  const labels: Record<string, string | undefined> = {
    warmth: measured?.axes?.hue?.label ?? data.undertone,
    depth: measured?.axes?.value?.label ?? data.depth,
    clarity: measured?.axes?.chroma?.label ?? data.chroma,
    contrast: measured?.contrast?.label ?? data.contrastLevel,
  };

  const rows = AXES.map((axis) => ({
    ...axis,
    value: (dna as unknown as Record<string, number | null>)[axis.key],
    label: labels[axis.key],
  })).filter((r) => typeof r.value === "number");

  if (rows.length === 0) return null;

  return (
    <section className="ed-section" aria-labelledby="dna-label">
      <h2 className="ed-section__label" id="dna-label">
        {t("results.dna.title")}
      </h2>
      <hr className="ed-rule" />
      <div className="ed-dna">
        {rows.map((row) => {
          const pct = Math.max(0, Math.min(100, row.value as number));
          return (
            <div className="ed-dna__row" key={row.key}>
              <span className="ed-dna__name">{t(row.nameKey)}</span>
              <span
                className="ed-dna__track"
                role="meter"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(row.nameKey)}
              >
                <span className="ed-dna__fill" style={{ inlineSize: `${pct}%` }} />
              </span>
              <span className="ed-dna__value ltr-run">
                {Math.round(pct)}
                {axisLabel(row.label) ? ` · ${axisLabel(row.label)}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* The receipt, immediately under the axes it explains. */}
      {measured && <MeasuredTable measured={measured} />}
    </section>
  );
}
