import { useT } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";
import { readDna } from "../../lib/bands";
import { describeHair, describeEyes, shortenPhrase } from "../../lib/descriptors";

/**
 * The measurement, said in words.
 *
 * The L/C/h table below this is the evidence; this is the sentence it supports.
 * Most people cannot read "skin 37.5 / 26.6 / 44.9" and most of the rest do not
 * want to — but everyone can check "warm, golden" against the mirror, which is
 * the only external test this app has.
 *
 * Undertone and contrast are the same two facts the Colour DNA prints as
 * numbers further down, so they take the same word from the same banding
 * (lib/bands.ts). Two readouts of one value that disagree — "Contrast: Medium"
 * above, "Contrast 78" below — cost more trust than either is worth. Only when
 * there is no number to agree with does the model's own phrase stand in.
 */
export default function TraitLine({ data }: { data: AnalysisResult }) {
  const t = useT();
  const m = data.measured;
  const dna = new Map(readDna(data.colorDNA).map((row) => [row.axis, row]));
  const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
  const warmth = dna.get("warmth");
  const contrast = dna.get("contrast");

  const traits = [
    {
      label: t("results.traits.undertone"),
      value: warmth ? capitalise(t(warmth.word)) : shortenPhrase(data.undertone, 3),
    },
    // Measured only. The model's prose describes texture as much as colour
    // ("naturally dense, deep black texture with..."), and a trait line that
    // mixes a measurement with a guess is a line nobody can trust. A region
    // that was not read is simply left out — the hair note below says why.
    { label: t("results.traits.hair"), value: describeHair(m?.hair) },
    { label: t("results.traits.eyes"), value: describeEyes(m?.eyes) },
    {
      label: t("results.traits.contrast"),
      value: contrast ? capitalise(t(contrast.word)) : shortenPhrase(data.contrastLevel, 2),
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
