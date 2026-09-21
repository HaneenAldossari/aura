import { useT } from "../../i18n";

/**
 * The model could not read the photo, or a demo sample failed to load.
 *
 * Distinct again from the other two: this one arrives after the upload, so the
 * tips matter more — the reader has already spent the effort once and needs to
 * know what to change before spending it again.
 */
export default function ErrorPanel({
  errorKind,
  error,
  photoTips,
  onRetry,
}: {
  errorKind: "photo" | "sample";
  error: string | null;
  photoTips: string[];
  onRetry: () => void;
}) {
  const t = useT();

  return (
    <div className="an-state">
      <h1 className="an-title">
        {t(errorKind === "sample" ? "errors.sampleTitle" : "errors.photoTitle")}
      </h1>
      <hr className="an-title__rule" />

      {error && <p className="an-lede">{error}</p>}

      {photoTips.length > 0 && (
        <>
          <h2 className="ed-section__label">{t("errors.tipsHeading")}</h2>
          <ol className="an-tips" style={{ marginBlockEnd: "var(--space-5)" }}>
            {photoTips.map((tip, i) => (
              <li className="an-tip" key={tip}>
                <span className="an-tip__n ltr-run">{String(i + 1).padStart(2, "0")}</span>
                <span className="an-tip__text">{tip}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="an-foot" style={{ marginBlockStart: 0 }}>
        <p className="an-foot__privacy">{t("analysis.privacy")}</p>
        <button type="button" className="ed-button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}
