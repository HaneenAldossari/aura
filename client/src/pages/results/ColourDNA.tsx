import { useT, type Key } from "../../i18n";
import { readDna, type DnaAxis } from "../../lib/bands";
import type { AnalysisResult } from "../../lib/types";
import MeasuredTable from "./MeasuredTable";

/**
 * The four axes: a number, and the word for that number.
 *
 * The word is derived from the value printed beside it, by the one banding in
 * lib/bands.ts (≤35 low, 36-64 medium, ≥65 high). It used to be borrowed from
 * the measurement layer's own axis labels, or from the model's prose where
 * measurement had not run — both cut on different thresholds from the ones
 * that produce the 0-100 value, which is how a reader came to be shown
 * "Contrast 78 · medium". A label next to a number is a claim about that
 * number and nothing else.
 */
const AXIS_NAME: Record<DnaAxis, Key> = {
  warmth: "results.dna.warmth",
  depth: "results.dna.depthAxis",
  clarity: "results.dna.clarity",
  contrast: "results.dna.contrastAxis",
};

export default function ColourDNA({ data }: { data: AnalysisResult }) {
  const t = useT();
  const rows = readDna(data.colorDNA);
  const measured = data.measured;

  if (rows.length === 0) return null;

  return (
    <section className="ed-section" aria-labelledby="dna-label">
      <h2 className="ed-section__label" id="dna-label">
        {t("results.dna.title")}
      </h2>
      <hr className="ed-rule" />
      <div className="ed-dna">
        {rows.map((row) => (
          <div className="ed-dna__row" key={row.axis} data-axis={row.axis} data-band={row.band}>
            <span className="ed-dna__name">{t(AXIS_NAME[row.axis])}</span>
            <span
              className="ed-dna__track"
              role="meter"
              aria-valuenow={row.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={`${row.value}, ${t(row.word)}`}
              aria-label={t(AXIS_NAME[row.axis])}
            >
              <span className="ed-dna__fill" style={{ inlineSize: `${row.value}%` }} />
            </span>
            <span className="ed-dna__value ltr-run">
              {row.value} · {t(row.word)}
            </span>
          </div>
        ))}
      </div>

      {/* The receipt, immediately under the axes it explains. */}
      {measured && <MeasuredTable measured={measured} />}
    </section>
  );
}
