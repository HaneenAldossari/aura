import { useT, type Key } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";

/**
 * What we assumed about their hair, and a way to change it.
 *
 * Shown whenever measurement ran, in all four variants, because a reader has
 * no other way to tell whether hair was part of the verdict — and hair carries
 * a quarter of the chroma axis, so "we left it out" changes what the answer
 * means.
 */
export default function HairNote({
  data,
  onChange,
  rerunning,
}: {
  data: AnalysisResult;
  onChange: () => void;
  rerunning: boolean;
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
      <button type="button" className="ed-link" onClick={onChange} disabled={rerunning}>
        {rerunning ? t("results.hairNote.rerunning") : t("results.hairNote.change")}
      </button>
    </div>
  );
}
