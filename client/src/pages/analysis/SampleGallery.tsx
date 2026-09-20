import { useT } from "../../i18n";
import { formatSeasonName } from "../../utils/formatSeason";
import type { DemoSample } from "../../lib/api";

/**
 * Generated faces, labelled only where the label can be stood behind.
 *
 * A season is shown plainly when the measurement and the model reached it
 * independently. Where they disagree the rules take the label — they are the
 * half with numbers behind them — and it carries a "measured" tag so nobody
 * reads a provisional answer as a settled one. A model-only label is never
 * shown: that is how two deep-skinned faces came to be captioned "Light
 * Summer" and "Light Spring", which cannot be true of either, since the light
 * seasons are light by definition.
 *
 * Quiet by design. It sits under the dropzone on a screen whose job is to get
 * one photo uploaded, so the thumbnails are small and the whole block reads as
 * an alternative rather than a competing choice.
 */
export default function SampleGallery({
  samples,
  onSampleClick,
}: {
  samples: DemoSample[];
  onSampleClick: (id: string) => void;
}) {
  const t = useT();
  if (samples.length === 0) return null;

  return (
    <section>
      <h2 className="ed-section__label">{t("analysis.samples.heading")}</h2>
      <p className="an-foot__hint" style={{ marginBlockEnd: "var(--space-3)" }}>
        {t("analysis.samples.note")}
      </p>
      <ul className="an-samples">
        {samples.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              className="an-sample"
              onClick={() => onSampleClick(sample.id)}
              aria-label={
                sample.season
                  ? t("analysis.samples.itemLabelled", {
                      season: formatSeasonName(sample.season),
                    })
                  : t("analysis.samples.itemLabel", {
                      n: sample.id.replace("sample-", ""),
                    })
              }
            >
              <img
                className="an-sample__img"
                src={`/demo-faces/${sample.id}.webp`}
                alt=""
                loading="lazy"
                decoding="async"
              />
              {sample.season && (
                <span
                  className={`an-sample__season${sample.needsReview ? " an-sample__season--provisional" : ""}`}
                >
                  {formatSeasonName(sample.season)}
                  {sample.needsReview && (
                    <span className="an-sample__tag">{t("analysis.samples.measured")}</span>
                  )}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
