import { useT, type Key } from "../../i18n";
import { MODEL_SPECS } from "../../../../measure/landmarks";
import "./analysis-editorial.css";

/**
 * Five stages, driven by real pipeline events.
 *
 * Never a timer. The old screen advanced on a schedule and told people their
 * hair was being read while a 16 MB model was still downloading — on a slow
 * connection it finished the whole sequence and then sat on the last frame.
 * Every row here reflects an event the pipeline actually emitted.
 *
 * The pipeline emits eight events; the design shows five rows. The extra three
 * are folded in rather than shown, because `decoding` and `preparing-upload`
 * are steps in the work the row above already names, and a row that appears for
 * 200ms is noise.
 */

export type LoadingStageKey =
  | "loading-face-model"
  | "checking"
  | "decoding"
  | "loading-detail-model"
  | "measuring"
  | "preparing-upload"
  | "analyzing"
  | "building";

const MB = (bytes: number) => (bytes / 1_000_000).toFixed(1);

const STAGES: {
  id: string;
  titleKey: Key;
  bodyKey: Key;
  events: LoadingStageKey[];
  /** Total download size, for the two stages that fetch a model. */
  bytes?: number;
}[] = [
  {
    id: "ready",
    titleKey: "analysis.stage5.readyTitle",
    bodyKey: "analysis.stage5.readyBody",
    events: ["loading-face-model"],
    bytes: MODEL_SPECS.landmarker.bytes,
  },
  {
    id: "checking",
    titleKey: "analysis.stage5.checkingTitle",
    bodyKey: "analysis.stage5.checkingBody",
    events: ["checking", "decoding"],
  },
  {
    id: "detail",
    titleKey: "analysis.stage5.detailTitle",
    bodyKey: "analysis.stage5.detailBody",
    events: ["loading-detail-model"],
    bytes: MODEL_SPECS.segmenter.bytes,
  },
  {
    id: "measuring",
    titleKey: "analysis.stage5.measuringTitle",
    bodyKey: "analysis.stage5.measuringBody",
    events: ["measuring", "preparing-upload"],
  },
  {
    id: "season",
    titleKey: "analysis.stage5.seasonTitle",
    bodyKey: "analysis.stage5.seasonBody",
    events: ["analyzing", "building"],
  },
];

/** How many checks the on-device quality gate runs, for the "passed" line. */
const QUALITY_CHECKS = 7;

export default function LoadingScreen({
  stage,
  stageProgress,
  onCancel,
}: {
  /** The stage the pipeline last reported. Undefined before the first event. */
  stage?: LoadingStageKey;
  /** 0-1 within the current stage, for the two model downloads. */
  stageProgress?: number;
  onCancel?: () => void;
}) {
  const t = useT();

  const activeIndex = stage
    ? STAGES.findIndex((s) => (s.events as string[]).includes(stage))
    : 0;
  const current = Math.max(0, activeIndex);

  return (
    <>
      <h1 className="an-title">{t("analysis.loadingTitle")}</h1>
      <hr className="an-title__rule" />

      <div className="an-stageline">
        <p className="an-lede" style={{ margin: 0 }}>
          {t("analysis.loadingLede")}
        </p>
        <span className="an-stageline__count ltr-run">
          {t("analysis.stageCount", { n: current + 1, total: STAGES.length })}
        </span>
      </div>

      <ol className="an-stages">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const fraction = active ? stageProgress : undefined;

          // A download reports a fraction; everything else is indeterminate,
          // which still has to move or a slow stage reads as a hang.
          const showBar = active && s.bytes !== undefined;
          const showIndeterminate = active && s.bytes === undefined;

          let status = t("analysis.statusWaiting");
          if (done && s.bytes) status = t("analysis.statusDownloaded", { mb: MB(s.bytes) });
          else if (done && s.id === "checking")
            status = t("analysis.statusChecksPassed", { n: QUALITY_CHECKS });
          else if (done) status = "";
          else if (active && s.bytes !== undefined && fraction !== undefined)
            status = t("analysis.statusDownloading", {
              percent: Math.round(fraction * 100),
              done: MB(s.bytes * fraction),
              total: MB(s.bytes),
            });
          else if (active) status = "";

          return (
            <li
              key={s.id}
              className={`an-stage${active ? " an-stage--active" : ""}${done ? " an-stage--done" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="an-stage__n ltr-run">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="an-stage__title">{t(s.titleKey)}</p>
                <p className="an-stage__body">{t(s.bodyKey)}</p>
              </div>
              <span className="an-stage__status">
                {showBar && (
                  <span className="an-progress">
                    <span
                      className="an-progress__fill"
                      style={{ inlineSize: `${Math.round((fraction ?? 0) * 100)}%` }}
                    />
                  </span>
                )}
                {showIndeterminate && (
                  <span className="an-progress an-progress--indeterminate">
                    <span className="an-progress__fill" />
                  </span>
                )}
                {status && <span className="ltr-run">{status}</span>}
              </span>
              <span className="an-stage__mark">
                {done ? t("analysis.statusDone") : active ? "" : t("analysis.statusPending")}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="an-foot">
        <p className="an-foot__privacy">{t("analysis.loadingPrivacy")}</p>
        {onCancel && (
          <button type="button" className="ed-link" onClick={onCancel}>
            {t("analysis.cancel")}
          </button>
        )}
      </div>
    </>
  );
}
