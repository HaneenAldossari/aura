import { useT } from "../../i18n";
import { formatSeasonName } from "../../utils/formatSeason";
import type { DemoSample } from "../../lib/api";

/**
 * Nine generated faces, each labelled with the season it actually returns.
 *
 * The labels are not decoration: they are read from the stored analyses, so
 * clicking a face gives exactly the season printed under it. That makes the
 * gallery a way to see all four families before committing a photo, rather
 * than a lucky dip.
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
                <span className="an-sample__season">
                  {formatSeasonName(sample.season)}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
