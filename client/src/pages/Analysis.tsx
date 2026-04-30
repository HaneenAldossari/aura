import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  Upload,
  Camera,
  X,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  Sparkles,
  Scan,
  Palette,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { analyzePhotos, loadDemoSample, listDemoSamples } from "../lib/api";

export default function Analysis() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "analyzing" | "error">("upload");
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"photo" | "sample">("photo");
  const [photoTips, setPhotoTips] = useState<string[]>([]);
  const [availableSamples, setAvailableSamples] = useState<string[]>([]);

  useEffect(() => {
    listDemoSamples().then(setAvailableSamples).catch(() => setAvailableSamples([]));
  }, []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    setSamplePreview(`/demo-faces/${sampleId}.png`);
    setStep("analyzing");
    setError(null);
    try {
      const minDelay = new Promise<void>((r) => setTimeout(r, 7000));
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
    <div className="min-h-screen">
      {/* Nav */}
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
              {/* Upload zone */}
              <div>
                {photo.preview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-gold/30 aspect-[4/5]">
                    <img
                      src={photo.preview}
                      alt="Face Photo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-espresso/80 flex items-center justify-center text-cream hover:bg-red-900 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-espresso/80 to-transparent">
                      <p className="text-cream text-xs font-medium">Face Photo</p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="rounded-2xl border-2 border-dashed border-gold/20 hover:border-gold/40 bg-espresso-light/50 hover:bg-espresso-light aspect-[4/5] flex flex-col items-center justify-center gap-3 cursor-pointer transition group"
                  >
                    <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center text-gold group-hover:bg-gold/15 transition">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-cream text-sm font-medium mb-1">Upload Your Face</p>
                      <p className="text-cream-muted text-xs leading-relaxed">
                        Natural daylight — no makeup, no filters
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-gold/50 text-xs">
                      <Upload className="w-3 h-3" />
                      Drop or tap to upload
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>

              {/* Sample gallery — privacy-friendly demo */}
              {availableSamples.length > 0 && (
                <div>
                  <p className="text-cream-muted text-xs uppercase tracking-widest mb-1">
                    Or try a sample face
                  </p>
                  <p className="text-cream-muted/70 text-xs mb-4">
                    AI-generated — explore without sharing your photo
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {availableSamples.map((id) => (
                      <button
                        key={id}
                        onClick={() => handleSampleClick(id)}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gold/15 hover:border-gold/50 transition cursor-pointer group"
                      >
                        <img
                          src={`/demo-faces/${id}.png`}
                          alt={id}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition" />
                      </button>
                    ))}
                  </div>
                </div>
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
            totalDuration={samplePreview ? 7000 : undefined}
          />
        )}

        {/* ─── Error / Retry ───────────────── */}
        {step === "error" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-warm-red/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-warm-red" />
            </div>
            <h2
              className="text-2xl font-bold text-cream mb-3"
              style={{ fontFamily: "Cormorant Garamond, serif" }}
            >
              {errorKind === "sample" ? "Couldn't Load Sample" : "Better Photos Needed"}
            </h2>
            <p className="text-cream-muted text-center max-w-md mb-6">
              {error}
            </p>

            {photoTips.length > 0 && (
              <div className="bg-espresso-light rounded-xl p-5 border border-gold/10 mb-6 max-w-md w-full">
                <p className="text-gold text-sm font-medium mb-3">
                  Tips for better photos:
                </p>
                <ul className="space-y-2">
                  {photoTips.map((tip) => (
                    <li
                      key={tip}
                      className="text-cream-muted text-sm flex items-start gap-2"
                    >
                      <span className="text-gold mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => {
                setStep("upload");
                setError(null);
                setPhotoTips([]);
                setErrorKind("photo");
                setSamplePreview(null);
                listDemoSamples().then(setAvailableSamples).catch(() => {});
              }}
              className="px-8 py-3 rounded-xl bg-gold text-espresso font-semibold hover:bg-gold-light transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   LOADING SCREEN COMPONENT
   ═══════════════════════════════════════════════ */

const ANALYSIS_STAGES = [
  {
    icon: <Scan className="w-5 h-5" />,
    title: "Uploading photos",
    description: "Sending your images securely to our AI...",
    duration: 3000,
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Detecting features",
    description: "Identifying your skin tone, eye color, and hair color...",
    duration: 5000,
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: "Analyzing undertone",
    description: "Examining warm vs. cool signals from skin and eyes...",
    duration: 6000,
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Determining your season",
    description: "Mapping depth, chroma, and undertone to your color season...",
    duration: 7000,
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Cross-validating results",
    description: "Running a second check to ensure accuracy...",
    duration: 8000,
  },
  {
    icon: <CheckCircle2 className="w-5 h-5" />,
    title: "Building your profile",
    description: "Generating your palette, makeup guide, and recommendations...",
    duration: 5000,
  },
];

function LoadingScreen({ uploadedPhotos, totalDuration: overrideTotal }: { uploadedPhotos: string[]; totalDuration?: number }) {
  const [activeStage, setActiveStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [funFact, setFunFact] = useState(0);

  const funFacts = [
    "Color analysis originated in the 1940s when artist Suzanne Caygill noticed people look better in certain color families.",
    "The 4-season system was popularized by Carole Jackson's 1980 book 'Color Me Beautiful'.",
    "Korean personal color analysis (퍼스널컬러) became a massive beauty trend in the 2010s.",
    "Your undertone never changes — it's determined by your melanin, hemoglobin, and carotenoid levels.",
    "Your natural hair color provides strong clues about whether you're warm or cool-toned.",
    "The 12-season system provides 3x more precision than the basic 4-season model.",
    "Wearing your right colors can make your skin look clearer and more even without any makeup.",
  ];

  // Progress through stages based on time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // If overrideTotal is given, scale every stage so the full sequence fits in that window
  const baseTotal = ANALYSIS_STAGES.reduce((sum, s) => sum + s.duration, 0);
  const scale = overrideTotal ? overrideTotal / baseTotal : 1;
  const stageDurations = ANALYSIS_STAGES.map((s) => s.duration * scale);
  const totalDuration = overrideTotal || baseTotal;

  useEffect(() => {
    let totalTime = 0;
    for (let i = 0; i < stageDurations.length; i++) {
      totalTime += stageDurations[i];
      if (elapsed < totalTime) {
        setActiveStage(i);
        return;
      }
    }
    setActiveStage(ANALYSIS_STAGES.length - 1);
  }, [elapsed, stageDurations]);

  // Cycle fun facts every 8 seconds (or proportionally faster in compressed mode)
  useEffect(() => {
    const interval = setInterval(() => {
      setFunFact((prev) => (prev + 1) % funFacts.length);
    }, Math.max(2500, 8000 * scale));
    return () => clearInterval(interval);
  }, [scale]);

  const progressPercent = Math.min(95, (elapsed / totalDuration) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] animate-fade-in">
      {/* Uploaded photo thumbnails with scanning effect */}
      <div className="flex gap-3 mb-10">
        {uploadedPhotos.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gold/30">
            <img src={src} alt="" className="w-full h-full object-cover" />
            {/* Scanning line animation */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-gold/80 shadow-[0_0_8px_rgba(201,169,110,0.8)]"
              style={{
                animation: "scan-line 2s ease-in-out infinite",
                animationDelay: `${i * 0.3}s`,
              }}
            />
            {/* Glow overlay */}
            <div className="absolute inset-0 bg-gold/5 animate-pulse-soft" />
          </div>
        ))}
      </div>

      {/* Main spinner */}
      <div className="relative mb-8">
        {/* Outer ring */}
        <svg className="w-28 h-28 animate-spin-slow" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(201,169,110,0.1)" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke="#C9A96E" strokeWidth="3"
            strokeDasharray={`${progressPercent * 2.83} ${283 - progressPercent * 2.83}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-300"
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gold animate-pulse-soft" key={activeStage}>
            {ANALYSIS_STAGES[activeStage].icon}
          </div>
        </div>
      </div>

      {/* Percentage */}
      <p className="text-gold text-2xl font-bold mb-1" style={{ fontFamily: "Cormorant Garamond, serif" }}>
        {Math.round(progressPercent)}%
      </p>

      {/* Current stage title */}
      <h2
        className="text-xl font-bold text-cream mb-1 transition-all duration-300"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
        key={`title-${activeStage}`}
      >
        {ANALYSIS_STAGES[activeStage].title}
      </h2>
      <p className="text-cream-muted text-sm text-center max-w-sm mb-8" key={`desc-${activeStage}`}>
        {ANALYSIS_STAGES[activeStage].description}
      </p>

      {/* Stage progress steps */}
      <div className="w-full max-w-md space-y-2 mb-10">
        {ANALYSIS_STAGES.map((stage, i) => {
          const isComplete = i < activeStage;
          const isActive = i === activeStage;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500 ${
                isActive
                  ? "bg-gold/10 border border-gold/20"
                  : isComplete
                  ? "bg-espresso-light/50 opacity-60"
                  : "opacity-30"
              }`}
            >
              {/* Status indicator */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  isComplete
                    ? "bg-warm-green/20 text-warm-green"
                    : isActive
                    ? "bg-gold/20 text-gold"
                    : "bg-espresso-lighter text-cream-muted/40"
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm transition-colors duration-300 ${
                  isActive ? "text-cream font-medium" : isComplete ? "text-cream-muted" : "text-cream-muted/50"
                }`}
              >
                {stage.title}
              </span>

              {/* Elapsed indicator for active */}
              {isActive && (
                <div className="ml-auto flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-soft" style={{ animationDelay: "0s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-soft" style={{ animationDelay: "0.4s" }} />
                </div>
              )}

              {/* Checkmark for complete */}
              {isComplete && (
                <span className="ml-auto text-warm-green text-xs">Done</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fun fact */}
      <div className="max-w-md text-center px-6 py-4 rounded-xl bg-espresso-light/50 border border-gold/8">
        <p className="text-gold text-xs uppercase tracking-widest mb-2">Did you know?</p>
        <p className="text-cream-muted text-sm leading-relaxed transition-opacity duration-500" key={funFact}>
          {funFacts[funFact]}
        </p>
      </div>

      {/* Reassurance */}
      <p className="text-cream-muted/40 text-xs mt-6">
        This usually takes 20-30 seconds — hang tight!
      </p>
    </div>
  );
}
