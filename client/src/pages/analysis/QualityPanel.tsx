import type { QualityIssue } from "../../lib/measure";
import { useT } from "../../i18n";

/**
 * The photo did not pass the on-device gate.
 *
 * This is the whole point of measuring before uploading: the photo never left
 * the device, nothing was spent on it, and the reader gets a specific sentence
 * per problem instead of a generic failure after a wait.
 *
 * Framed as a retake, never as a rejection — the issues are numbered like the
 * upload screen's tips because they are the same list, now specific to one
 * photo.
 */
export default function QualityPanel({
  issues,
  onRetake,
}: {
  issues: QualityIssue[];
  onRetake: () => void;
}) {
  const t = useT();
  const fatal = issues.some((i) => i.fatal);

  return (
    <div className="an-state">
      <h1 className="an-title">
        {t(fatal ? "errors.qualityFatalTitle" : "errors.qualitySoftTitle")}
      </h1>
      <hr className="an-title__rule" />

      <ol className="an-tips" style={{ marginBlockEnd: "var(--space-5)" }}>
        {issues.map((issue, i) => (
          <li className="an-tip" key={issue.code}>
            <span className="an-tip__n ltr-run">{String(i + 1).padStart(2, "0")}</span>
            <span className="an-tip__text">{issue.message}</span>
          </li>
        ))}
      </ol>

      <div className="an-foot" style={{ marginBlockStart: 0 }}>
        <p className="an-foot__privacy">{t("errors.qualityPrivacy")}</p>
        <button type="button" className="ed-button" onClick={onRetake}>
          {t("errors.qualityRetake")}
        </button>
      </div>
    </div>
  );
}
