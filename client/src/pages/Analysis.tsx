import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { analyzeMeasured, loadDemoSample, listDemoSamples, type DemoSample } from "../lib/api";
import { measureFile, measureBytes, averageFeatures, warmUpModels, type QualityIssue } from "../lib/measure";
import type { HairStatus } from "../lib/types";
import HairStatusToggle from "./analysis/HairStatusToggle";
import QualityPanel from "./analysis/QualityPanel";
import SystemErrorPanel from "./analysis/SystemErrorPanel";
import { createStageQueue } from "../../../measure/stageQueue";
import { newResultId, saveResult, loadResult } from "../lib/resultStore";
import type { LoadingStageKey } from "./analysis/LoadingScreen";
import UploadZone from "./analysis/UploadZone";
import SampleGallery from "./analysis/SampleGallery";
import LoadingScreen from "./analysis/LoadingScreen";
import ErrorPanel from "./analysis/ErrorPanel";
import { useT } from "../i18n";
import { cachePhoto, getCachedPhoto, rekeyCachedPhoto } from "../lib/photoCache";
import Masthead from "./results/Masthead";
import "./analysis/analysis-editorial.css";

export default function Analysis() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Second-photo mode: the nudge on Results sends people here with the id of
  // the analysis to firm up. The first photo is still in memory; this one is
  // measured under different light and the two are averaged.
  const secondFor = params.get("second") || undefined;
  const firstPhoto = getCachedPhoto(secondFor);
  const isSecond = Boolean(secondFor && firstPhoto);
  const [step, setStep] = useState<
    "upload" | "analyzing" | "error" | "quality" | "system"
  >("upload");
  const [systemMessage, setSystemMessage] = useState("");
  const [hairStatus, setHairStatus] = useState<HairStatus>("natural");
  const [qualityIssues, setQualityIssues] = useState<QualityIssue[]>([]);
  const [stage, setStage] = useState<LoadingStageKey | undefined>(undefined);
  const [stageProgress, setStageProgress] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"photo" | "sample">("photo");
  const [photoTips, setPhotoTips] = useState<string[]>([]);
  // Show the 9 thumbnails instantly — they're static assets in client/public/demo-faces/.
  // Then in the background confirm with the API which actually have analyses ready
  // (fall back to the static list if the API fails — keeps the gallery visible).
  // Thumbnails render instantly from the static assets; the API then replaces
  // this with the real list and its labels. No label until then, because an
  // unverified one is exactly what this gallery is not allowed to show.
  const STATIC_SAMPLES: DemoSample[] = Array.from({ length: 9 }, (_, i) => ({
    id: `sample-${i + 1}`,
    season: "",
    agrees: false,
    needsReview: true,
  }));
  const [availableSamples, setAvailableSamples] = useState<DemoSample[]>(STATIC_SAMPLES);

  // 20 MB of models, on versioned immutable URLs. Starting now overlaps the
  // download with the user choosing a photo instead of stacking on top of it.
  useEffect(() => {
    warmUpModels();
  }, []);

  useEffect(() => {
    listDemoSamples()
      .then((s) => { if (s.length > 0) setAvailableSamples(s); })
      .catch(() => { /* keep static fallback */ });
  }, []);

  const [photo, setPhoto] = useState<{ file: File | null; preview: string | null }>({
    file: null,
    preview: null,
  });

  const hasPhoto = !!photo.file;

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto({ file, preview: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, []);

  const removePhoto = () => {
    setPhoto({ file: null, preview: null });
  };

  const handleSampleClick = async (sampleId: string) => {
    setStep("analyzing");
    setError(null);
    try {
      // Brief pause so the loading choreography reads once, without feeling fake
      const minDelay = new Promise<void>((r) => setTimeout(r, 2500));
      const { result } = await loadDemoSample(sampleId);
      await minDelay;
      const id = newResultId();
      saveResult(id, result);
      navigate(`/results/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.sampleLoad");
      setError(message);
      setErrorKind("sample");
      setStep("error");
    }
  };

  const handleAnalyze = async () => {
    if (!photo.file) return;

    setStep("analyzing");
    setError(null);
    setStage("loading-face-model");
    setStageProgress(undefined);

    try {
      // A stage that completes instantly would otherwise flash past unreadably;
      // the queue holds each label for a minimum, without stretching a real one.
      const stages = createStageQueue<LoadingStageKey>({
        onChange: (next) => setStage(next),
      });

      // Measure on-device first. A photo that fails the gate never leaves the
      // browser, so nothing is spent on it and the advice is specific.
      const outcome = await measureFile(photo.file, hairStatus, (event) => {
        stages.push(event.stage as LoadingStageKey);
        setStageProgress(event.progress);
      });

      // Ours, not the photo's: a decoder that would not load or a model download
      // that failed says nothing about the picture, so it must not appear in the
      // quality panel. Raw error to the console only.
      if (outcome.kind === "system") {
        console.error("[aura] measurement failed:", outcome.error);
        stages.stop();
        setSystemMessage(outcome.message);
        setStep("system");
        return;
      }

      if (outcome.kind === "quality") {
        stages.stop();
        setQualityIssues(outcome.quality.issues);
        setStep("quality");
        return;
      }

      stages.push("analyzing");
      setStageProgress(undefined);

      // A second photo firms up the measurement; it does not re-judge the
      // face. The two feature sets are averaged in Lab (hue is circular, so
      // the mean of 350 and 10 degrees is 180 — the opposite colour), and the
      // image sent is still the first one, which is what the verdict was built
      // on.
      let features = outcome.features;
      let uploadBytes = outcome.upload.bytes;

      if (isSecond && firstPhoto) {
        const firstOutcome = await measureBytes(firstPhoto.bytes, hairStatus);
        if (firstOutcome.kind === "measured") {
          features = averageFeatures(firstOutcome.features, outcome.features);
          uploadBytes = firstOutcome.upload.bytes;
        }
      }

      const { result } = await analyzeMeasured(uploadBytes, features.forScoring);

      if (result.error === "low_confidence") {
        setError(result.message as string || t("errors.lowConfidence"));
        setPhotoTips((result.photoTips as string[]) || []);
        setErrorKind("photo");
        setStep("error");
        return;
      }

      // Stateless API: keep the result here and put a local key in the URL.
      const id = newResultId();
      // Client-side annotation: the API saw one merged feature set and cannot
      // know how many photos produced it.
      saveResult(id, { ...result, photoCount: isSecond ? 2 : 1 });
      if (isSecond && firstPhoto) {
        // Keep the original photo, so "change hair answer" still works after
        // a second photo has been added.
        rekeyCachedPhoto(secondFor, id);
      } else {
        // In memory only, so Results can re-run against the same pixels when
        // the hair answer changes. Never on disk — see lib/photoCache.ts.
        cachePhoto(id, outcome.upload.bytes, hairStatus);
      }
      navigate(`/results/${id}`);
    } catch (err) {
      // Reaching here means the upload or the API failed. Still not the user's
      // photo — the gate already passed it — so this is a system error too.
      console.error("[aura] analysis request failed:", err);
      setSystemMessage(
        err instanceof Error && /network|fetch|load failed/i.test(err.message)
          ? t("errors.offline")
          : t("errors.server")
      );
      setStep("system");
    }
  };

  const handleRetake = () => {
    setQualityIssues([]);
    setPhoto({ file: null, preview: null });
    setStep("upload");
  };

  const tips = [
    t("analysis.tip1"),
    t("analysis.tip2"),
    t("analysis.tip3"),
    t("analysis.tip4"),
  ];

  const stepMeta =
    step === "analyzing" ? t("analysis.stepAnalysis") : t("analysis.stepPhoto");

  return (
    <div className="ed-page">
      <div className="ed-shell">
        <Masthead meta={stepMeta} />

        {/* ── Upload ─────────────────────────────────────────────────── */}
        {step === "upload" && (
          <>
            <h1 className="an-title">
              {t(isSecond ? "analysis.secondTitle" : "analysis.photoTitle")}
            </h1>
            <hr className="an-title__rule" />
            <p className="an-lede">
              {t(isSecond ? "analysis.secondLede" : "analysis.photoLede")}
            </p>

            <div className="an-grid">
              <div>
                <UploadZone
                  preview={photo.preview}
                  onFileSelect={handleFileSelect}
                  onRemove={removePhoto}
                />

                {availableSamples.length > 0 && (
                  <div style={{ marginBlockStart: "var(--space-5)" }}>
                    <SampleGallery
                      samples={availableSamples}
                      onSampleClick={handleSampleClick}
                    />
                  </div>
                )}
              </div>

              <div>
                <HairStatusToggle value={hairStatus} onChange={setHairStatus} />

                <h2 className="ed-section__label">{t("analysis.accurateRead")}</h2>
                <ol className="an-tips">
                  {tips.map((tip, i) => (
                    <li className="an-tip" key={tip}>
                      <span className="an-tip__n ltr-run">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="an-tip__text">{tip}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="an-foot">
              <div>
                <p className="an-foot__privacy">{t("analysis.privacy")}</p>
                {!hasPhoto && (
                  <p className="an-foot__hint">{t("analysis.chooseToContinue")}</p>
                )}
              </div>
              <button
                type="button"
                className="ed-button"
                onClick={handleAnalyze}
                disabled={!hasPhoto}
              >
                {t("analysis.analyse")}
              </button>
            </div>
          </>
        )}

        {/* ── Loading ────────────────────────────────────────────────── */}
        {step === "analyzing" && (
          <LoadingScreen
            stage={stage}
            stageProgress={stageProgress}
            onCancel={() => navigate("/")}
          />
        )}

        {/* ── The three failure states ───────────────────────────────── */}
        {step === "quality" && (
          <QualityPanel issues={qualityIssues} onRetake={() => setStep("upload")} />
        )}

        {step === "system" && (
          <SystemErrorPanel message={systemMessage} onRetry={() => setStep("upload")} />
        )}

        {step === "error" && (
          <ErrorPanel
            errorKind={errorKind}
            error={error}
            photoTips={photoTips}
            onRetry={() => setStep("upload")}
          />
        )}
      </div>
    </div>
  );
}
