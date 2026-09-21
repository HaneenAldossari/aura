import { useState } from "react";
import { useT } from "../../i18n";

/**
 * A suggestion, never a gate.
 *
 * `needsSecondPhoto` comes from thresholds Phase 4 has not calibrated yet, so
 * this must never block the result or imply it is wrong — hence dismissible,
 * and hence the copy saying nothing changes until a photo is added.
 */
export default function SecondPhotoNudge({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <aside className="ed-nudge">
      <p className="ed-nudge__text">{t("results.nudge.body")}</p>
      <span style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
        <button type="button" className="ed-link" onClick={onAdd}>
          {t("results.nudge.action")}
        </button>
        <button
          type="button"
          className="ed-link"
          style={{ color: "var(--ink-muted)", borderColor: "var(--rule-strong)" }}
          onClick={() => setDismissed(true)}
        >
          {t("results.nudge.dismiss")}
        </button>
      </span>
    </aside>
  );
}
