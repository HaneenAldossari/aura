import { useT, type Key } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";

/**
 * What we assumed about their hair, and the way to try the other answer.
 *
 * Shown whenever measurement ran, in all four variants, because a reader has
 * no other way to tell whether hair was part of the verdict — and hair carries
 * a quarter of the chroma axis, so "we left it out" changes what the answer
 * means.
 *
 * The link leaves this page. It does not re-run anything here: a different
 * hair answer is a different analysis, so it is started from Upload — same
 * photo, already loaded — by pressing Analyse, and lands on a result of its
 * own. The one on this page stays what it was.
 */
export default function HairNote({
  data,
  onRedo,
}: {
  data: AnalysisResult;
  onRedo: () => void;
}) {
  const t = useT();
  if (!data.measured) return null;

  let key: Key;
  if (data.hairAvailable === false && data.measured.hairStatus === "natural") {
    // Said natural, but the segmenter could not read it — our failure, not theirs.
    key = "results.hairNote.unavailable";
  } else if (data.measured.hairStatus === "dyed") {
    key = "results.hairNote.coloured";
  } else if (data.measured.hairStatus === "covered") {
    key = "results.hairNote.covered";
  } else {
    key = "results.hairNote.natural";
  }

  return (
    <div className="ed-note">
      <p className="ed-note__text">{data.hairNote || t(key)}</p>
      <button type="button" className="ed-link" onClick={onRedo}>
        {t("results.hairNote.change")}
      </button>
    </div>
  );
}
