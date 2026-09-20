import { Camera, RefreshCw } from "lucide-react";
import type { QualityIssue } from "../../lib/measure";
import { useT } from "../../i18n";

/**
 * Shown when the browser-side quality gate rejects a photo.
 *
 * This is the whole point of measuring before uploading: the photo never leaves
 * the device, nothing is spent on it, and the user hears a specific, actionable
 * sentence instead of a generic failure after a wait.
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
    <div
      className="rounded-2xl p-6 max-w-lg mx-auto"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Camera size={20} style={{ color: "var(--accent-gold)" }} aria-hidden />
        <h2 className="text-lg" style={{ color: "var(--text-primary)" }}>
          {t(fatal ? "errors.qualityFatalTitle" : "errors.qualitySoftTitle")}
        </h2>
      </div>

      <ul className="space-y-3 mb-6">
        {issues.map((issue) => (
          <li
            key={issue.code}
            className="text-sm leading-relaxed pl-4 border-l-2"
            style={{ color: "var(--text-primary)", borderColor: "var(--accent-gold)" }}
          >
            {issue.message}
          </li>
        ))}
      </ul>

      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        {t("errors.qualityPrivacy")}
      </p>

      <button
        type="button"
        onClick={onRetake}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
        style={{ background: "var(--accent-gold)", color: "var(--bg-base, #10100e)" }}
      >
        <RefreshCw size={16} aria-hidden />
        {t("errors.qualityRetake")}
      </button>
    </div>
  );
}
