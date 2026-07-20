import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { analyzePhotos, loadDemoSample, listDemoSamples } from "../lib/api";
import UploadZone from "./analysis/UploadZone";
import SampleGallery from "./analysis/SampleGallery";
import LoadingScreen from "./analysis/LoadingScreen";
import ErrorPanel from "./analysis/ErrorPanel";

export default function Analysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "analyzing" | "error">("upload");
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"photo" | "sample">("photo");
  const [photoTips, setPhotoTips] = useState<string[]>([]);
  // Show the 9 thumbnails instantly — they're static assets in client/public/demo-faces/.
  // Then in the background confirm with the API which actually have analyses ready
  // (fall back to the static list if the API fails — keeps the gallery visible).
  const STATIC_SAMPLES = Array.from({ length: 9 }, (_, i) => `sample-${i + 1}`);
  const [availableSamples, setAvailableSamples] = useState<string[]>(STATIC_SAMPLES);

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
      const { sessionId } = await loadDemoSample(sampleId);
      await minDelay;
      navigate(`/results/${sessionId}`);
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

    try {
      const { sessionId, result } = await analyzePhotos([photo.file]);

      // Check for low confidence error
      if (result.error === "low_confidence") {
        setError(result.message as string || "The AI needs better photos for an accurate analysis.");
        setPhotoTips((result.photoTips as string[]) || []);
        setErrorKind("photo");
        setStep("error");
        return;
      }

      navigate(`/results/${sessionId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setErrorKind("photo");
      setStep("error");
    }
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
          />
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
