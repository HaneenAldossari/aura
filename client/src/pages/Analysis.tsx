import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { analyzeMeasured, analyzePhotos, loadDemoSample, listDemoSamples } from "../lib/api";
import { measureFile, warmUpModels, type QualityIssue } from "../lib/measure";
import type { HairStatus } from "../lib/types";
import HairStatusToggle from "./analysis/HairStatusToggle";
import QualityPanel from "./analysis/QualityPanel";
import SystemErrorPanel from "./analysis/SystemErrorPanel";
import { createStageQueue } from "../../../measure/stageQueue";
import { newResultId, saveResult } from "../lib/resultStore";
import type { LoadingStageKey } from "./analysis/LoadingScreen";
import UploadZone from "./analysis/UploadZone";
import SampleGallery from "./analysis/SampleGallery";
import LoadingScreen from "./analysis/LoadingScreen";
import ErrorPanel from "./analysis/ErrorPanel";

export default function Analysis() {
  const navigate = useNavigate();
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
  const STATIC_SAMPLES = Array.from({ length: 9 }, (_, i) => `sample-${i + 1}`);
  const [availableSamples, setAvailableSamples] = useState<string[]>(STATIC_SAMPLES);

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
  const [samplePreview, setSamplePreview] = useState<string | null>(null);

  const hasPhoto = !!photo.file;

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhoto({ file, preview: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const removePhoto = () => {
    setPhoto({ file: null, preview: null });
  };

  const handleSampleClick = async (sampleId: string) => {
    setSamplePreview(`/demo-faces/${sampleId}.webp`);
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
      const message = err instanceof Error ? err.message : "Failed to load sample.";
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

      const { result } = await analyzeMeasured(
        outcome.upload.bytes,
        outcome.features.forScoring
      );

      if (result.error === "low_confidence") {
        setError(result.message as string || "The AI needs better photos for an accurate analysis.");
        setPhotoTips((result.photoTips as string[]) || []);
        setErrorKind("photo");
        setStep("error");
        return;
      }

      stages.push("building");
      // Stateless API: keep the result here and put a local key in the URL.
      const id = newResultId();
      saveResult(id, result);
      navigate(`/results/${id}`);
    } catch (err) {
      // Reaching here means the upload or the API failed. Still not the user's
      // photo — the gate already passed it — so this is a system error too.
      console.error("[aura] analysis request failed:", err);
      setSystemMessage(
        err instanceof Error && /network|fetch|load failed/i.test(err.message)
          ? "We couldn't reach the server. Check your connection and try again."
          : "Something went wrong on our side — this isn't a problem with your photo. Please try again."
      );
      setStep("system");
    }
  };

  const handleRetake = () => {
    setQualityIssues([]);
    setPhoto({ file: null, preview: null });
    setStep("upload");
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Nav — kept local instead of NavShell: this page uses py-4 (NavShell is py-3 + gap-4) */}
      <nav className="fixed top-0 w-full z-50 glass-dark">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-cream-muted hover:text-cream transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-gold text-sm font-medium">
            Step {step === "upload" ? "1" : "2"} of 2
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        {/* ─── Upload Step ─────────────────── */}
        {step === "upload" && (
          <div className="animate-fade-in-up">
            <h1
              className="text-3xl md:text-4xl font-bold text-cream mb-2"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              Upload Your Photo
            </h1>
            <p className="text-cream-muted mb-8">
              Upload a clear photo of your face — natural lighting, no filters, hair visible
            </p>

            {/* Upload + Sample gallery — side-by-side on desktop */}
            <div className="grid md:grid-cols-2 gap-6 md:gap-8 mb-8 items-start">
              <UploadZone
                preview={photo.preview}
                onFileSelect={handleFileSelect}
                onDrop={handleDrop}
                onRemove={removePhoto}
              />

              {/* Sample gallery — privacy-friendly demo */}
              {availableSamples.length > 0 && (
                <SampleGallery samples={availableSamples} onSampleClick={handleSampleClick} />
              )}
            </div>

            {/* Hair status — asked before analysis because dyed or covered hair
                carries no information about natural colouring. */}
            {hasPhoto && (
              <div className="mb-8">
                <HairStatusToggle value={hairStatus} onChange={setHairStatus} />
              </div>
            )}

            {/* Tip */}
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 text-sm text-cream-muted mb-8">
              <strong className="text-gold">Tip:</strong> Remove makeup if
              possible for the most accurate results. Avoid filters, ring
              lights, and artificial lighting.
            </div>

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!hasPhoto}
              className="w-full py-4 rounded-xl bg-gold text-espresso font-semibold text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gold-light transition cursor-pointer"
            >
              {hasPhoto ? "Analyze Photo" : "Upload a photo to begin"}
            </button>
          </div>
        )}

        {/* ─── Analyzing — Full Loading Page ─ */}
        {step === "analyzing" && (
          <LoadingScreen
            uploadedPhotos={samplePreview ? [samplePreview] : photo.preview ? [photo.preview] : []}
            totalDuration={samplePreview ? 2500 : undefined}
            stage={samplePreview ? undefined : stage}
            stageProgress={samplePreview ? undefined : stageProgress}
          />
        )}

        {/* ─── Quality gate — nothing was uploaded ─ */}
        {step === "quality" && (
          <div className="animate-fade-in-up">
            <QualityPanel issues={qualityIssues} onRetake={handleRetake} />
          </div>
        )}

        {/* ─── Our failure, not the photo's ─ */}
        {step === "system" && (
          <div className="animate-fade-in-up">
            <SystemErrorPanel
              message={systemMessage}
              onRetry={() => {
                setSystemMessage("");
                setStep("upload");
              }}
            />
          </div>
        )}

        {/* ─── Error / Retry ───────────────── */}
        {step === "error" && (
          <ErrorPanel
            errorKind={errorKind}
            error={error}
            photoTips={photoTips}
            onRetry={() => {
              setStep("upload");
              setError(null);
              setPhotoTips([]);
              setErrorKind("photo");
              setSamplePreview(null);
              listDemoSamples().then(setAvailableSamples).catch(() => {});
            }}
          />
        )}
      </div>
    </div>
  );
}
