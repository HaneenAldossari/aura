import { useT } from "../../i18n";

/**
 * Our failure, shown as ours.
 *
 * Deliberately a different component from QualityPanel. A decoder that would
 * not load, a model download that failed, a WASM compile error — none of those
 * say anything about the photo, and putting them behind "better photos needed"
 * sends someone off to re-shoot a picture that was fine. That is exactly what
 * happened when the decoder .wasm 404'd to index.html: the user saw
 * "Aborted(CompileError…)" under a heading blaming their photo.
 *
 * The raw error goes to the console, never on screen.
 */
export default function SystemErrorPanel({
  title,
  message,
  onRetry,
}: {
  /** Defaults to "something went wrong on our side"; a daily limit is not that. */
  title?: string;
  message: string;
  onRetry: () => void;
}) {
  const t = useT();

  return (
    <div className="an-state">
      <h1 className="an-title">{title ?? t("errors.systemTitle")}</h1>
      <hr className="an-title__rule" />

      {/* One line. It already says the photo is not the problem; a second
          sentence saying so again made a small failure look like a big one. */}
      <p className="an-lede" style={{ marginBlockEnd: "var(--space-5)" }}>{message}</p>

      <div className="an-foot" style={{ marginBlockStart: 0 }}>
        <p className="an-foot__privacy">{t("errors.qualityPrivacy")}</p>
        <button type="button" className="ed-button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      </div>
    </div>
  );
}
