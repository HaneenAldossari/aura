import { useEffect, useRef } from "react";
import { useT } from "../../i18n";
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
/** The fragment Home links to. */
const SAMPLES_ID = "samples";

export default function SampleGallery({
  samples,
  onSampleClick,
}: {
  samples: DemoSample[];
  onSampleClick: (id: string) => void;
}) {
  const t = useT();
  const sectionRef = useRef<HTMLElement>(null);
  const hasSamples = samples.length > 0;

  // Home's "Try a sample face" links to /analyse#samples. The router does not
  // scroll to a hash, and the gallery sits below the dropzone, so without this
  // the link lands on a screen that looks like it ignored the request.
  useEffect(() => {
    if (!hasSamples || window.location.hash !== `#${SAMPLES_ID}`) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    sectionRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    sectionRef.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [hasSamples]);

  if (!hasSamples) return null;

  return (
    <section id={SAMPLES_ID} ref={sectionRef}>
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
              {/* A number, never a season. The season belongs on the results
                  page, after an analysis the reader asked for — and a labelled
                  gallery turns "try one" into "pick the season you hope for". */}
              <span className="an-sample__season">
                <span className="ltr-run">{String(i + 1).padStart(2, "0")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
