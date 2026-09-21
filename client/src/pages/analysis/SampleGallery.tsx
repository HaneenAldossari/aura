import { useT } from "../../i18n";
import { formatSeasonName } from "../../utils/formatSeason";
import type { DemoSample } from "../../lib/api";

/**
 * Generated faces to try the analysis on.
 *
 * A card carries a season only where the measurement and the model reached it
 * independently, at primary level. Anything short of that shows the face and a
 * number: a caption on a card is read as a fact about the face, and there is no
 * room there to explain that one half of the system disagreed.
 *
 * The season is deliberately not shown here. These faces are AI-generated and
 * every one of them trips the quality gate's colour-cast check, so none has a
 * label that could be stood behind — and a caption on a card is read as a fact
 * about the face rather than as one system's provisional guess. The season
 * belongs on the results page, after an analysis the reader asked for.
 *
 * The data behind the labels still arrives (`season`, `agrees`, `needsReview`)
 * and the rule that governs them is intact in the demo-list handler: show a
 * season only where the measurement and the model agree at primary level with
 * a clean gate, otherwise the measured ranking with a tag, and never a
 * model-only label. It switches back on the moment vetted faces land — see
 * scripts/vetDemoFaces.ts.
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
        {samples.map((sample, i) => (
          <li key={sample.id}>
            <button
              type="button"
              className="an-sample"
              onClick={() => onSampleClick(sample.id)}
              aria-label={t("analysis.samples.itemLabel", { n: i + 1 })}
            >
              <img
                className="an-sample__img"
                src={`/demo-faces/${sample.id}.webp`}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="an-sample__season">
                {sample.agrees && sample.season ? (
                  formatSeasonName(sample.season)
                ) : (
                  <span className="ltr-run">{String(i + 1).padStart(2, "0")}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
