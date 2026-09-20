import { useT } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";
import { describeHair, describeEyes, shortenPhrase } from "../../lib/descriptors";

/**
 * The measurement, said in words.
 *
 * The L/C/h table below this is the evidence; this is the sentence it supports.
 * Most people cannot read "skin 37.5 / 26.6 / 44.9" and most of the rest do not
 * want to — but everyone can check "warm, golden" against the mirror, which is
 * the only external test this app has.
 *
 * Drawn from the measured axes where measurement ran, and from the model's own
 * assessment otherwise. Never a threshold re-applied here, which would be a
 * third opinion on a question already answered twice.
 */
export default function TraitLine({ data }: { data: AnalysisResult }) {
  const t = useT();
  const m = data.measured;

  const traits = [
    {
      label: t("results.traits.undertone"),
      value: shortenPhrase(m?.axes?.hue?.label ?? data.undertone, 3),
    },
    // Measured only. The model's prose describes texture as much as colour
    // ("naturally dense, deep black texture with..."), and a trait line that
    // mixes a measurement with a guess is a line nobody can trust. A region
    // that was not read is simply left out — the hair note below says why.
    { label: t("results.traits.hair"), value: describeHair(m?.hair) },
    { label: t("results.traits.eyes"), value: describeEyes(m?.eyes) },
    {
      label: t("results.traits.contrast"),
      value: shortenPhrase(m?.contrast?.label ?? data.contrastLevel, 2),
    },
  ].filter((x): x is { label: string; value: string } => Boolean(x.value));

  if (traits.length === 0) return null;

  return (
    <dl className="ed-traits">
      {traits.map((trait) => (
        <div className="ed-trait" key={trait.label}>
          <dt className="ed-trait__label">{trait.label}</dt>
          <dd className="ed-trait__value">{trait.value}</dd>
        </div>
      ))}
    </dl>
  );
}
