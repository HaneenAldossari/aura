import { useState, useEffect, type ReactNode } from "react";
import {
  Loader2,
  Eye,
  Sparkles,
  Scan,
  Palette,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useT, type Key } from "../../i18n";

/* Stage keys are the pipeline's own event names and must not change; the copy
   beside each one is a catalogue key, resolved per render. */
const ANALYSIS_STAGES = [
  { icon: <Scan />, key: "loading-face-model", titleKey: "loading.stage.faceModelTitle", bodyKey: "loading.stage.faceModelBody", duration: 4000 },
  { icon: <Eye />, key: "checking", titleKey: "loading.stage.checkingTitle", bodyKey: "loading.stage.checkingBody", duration: 3000 },
  { icon: <Palette />, key: "loading-detail-model", titleKey: "loading.stage.detailModelTitle", bodyKey: "loading.stage.detailModelBody", duration: 6000 },
  { icon: <Sparkles />, key: "measuring", titleKey: "loading.stage.measuringTitle", bodyKey: "loading.stage.measuringBody", duration: 4000 },
  { icon: <ShieldCheck />, key: "analyzing", titleKey: "loading.stage.analysingTitle", bodyKey: "loading.stage.analysingBody", duration: 12000 },
  { icon: <CheckCircle2 />, key: "building", titleKey: "loading.stage.buildingTitle", bodyKey: "loading.stage.buildingBody", duration: 5000 },
] as const satisfies ReadonlyArray<{ icon: ReactNode; key: string; titleKey: Key; bodyKey: Key; duration: number }>;

/* Named, not indexed: a translator sees what each fact is, and reordering is safe. */
const FACT_KEYS = [
  "loading.fact.caygill",
  "loading.fact.jackson",
  "loading.fact.korea",
  "loading.fact.undertone",
  "loading.fact.hair",
  "loading.fact.precision",
  "loading.fact.skin",
] as const satisfies ReadonlyArray<Key>;

/** Stage keys the pipeline and the upload step emit. */
export type LoadingStageKey = (typeof ANALYSIS_STAGES)[number]["key"];

export default function LoadingScreen({
  uploadedPhotos,
  totalDuration: overrideTotal,
  stage,
  stageProgress,
}: {
  uploadedPhotos: string[];
  totalDuration?: number;
  /**
   * The stage actually running. When given, the display follows real pipeline
   * events; the timer below is only a fallback for demo-sample playback, where
   * there is no local work to report.
   */
  stage?: LoadingStageKey;
  /** 0-1 within the current stage, for the two model downloads. */
  stageProgress?: number;
}) {
  const t = useT();
  const [activeStage, setActiveStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [funFact, setFunFact] = useState(0);

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

  const drivenIndex = stage
    ? ANALYSIS_STAGES.findIndex((s) => s.key === stage)
    : -1;

  useEffect(() => {
    if (drivenIndex >= 0) {
      setActiveStage(drivenIndex);
      return;
    }
    let totalTime = 0;
    for (let i = 0; i < stageDurations.length; i++) {
      totalTime += stageDurations[i];
      if (elapsed < totalTime) {
        setActiveStage(i);
        return;
      }
    }
    setActiveStage(ANALYSIS_STAGES.length - 1);
  }, [elapsed, stageDurations, drivenIndex]);

  // Cycle fun facts every 8 seconds (or proportionally faster in compressed mode)
  useEffect(() => {
    const interval = setInterval(() => {
      setFunFact((prev) => (prev + 1) % FACT_KEYS.length);
    }, Math.max(2500, 8000 * scale));
    return () => clearInterval(interval);
  }, [scale]);

  // Real stages: each completed stage is worth an equal share, plus whatever
  // fraction of the current one we know about. Still capped below 100 so the
  // ring never completes before navigation.
  const progressPercent =
    drivenIndex >= 0
      ? Math.min(
          97,
          ((drivenIndex + (stageProgress ?? 0)) / ANALYSIS_STAGES.length) * 100
        )
      : Math.min(95, (elapsed / totalDuration) * 100);

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
        {t(ANALYSIS_STAGES[activeStage].titleKey)}
      </h2>
      <p className="text-cream-muted text-sm text-center max-w-sm mb-8" key={`desc-${activeStage}`}>
        {t(ANALYSIS_STAGES[activeStage].bodyKey)}
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
                {t(stage.titleKey)}
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
                <span className="ml-auto text-warm-green text-xs">{t("loading.done")}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Fun fact */}
      <div className="max-w-md text-center px-6 py-4 rounded-xl bg-espresso-light/50 border border-gold/8">
        <p className="text-gold text-xs uppercase tracking-widest mb-2">{t("loading.didYouKnow")}</p>
        <p className="text-cream-muted text-sm leading-relaxed transition-opacity duration-500" key={funFact}>
          {t(FACT_KEYS[funFact])}
        </p>
      </div>

      {/* Reassurance */}
      <p className="text-cream-muted/40 text-xs mt-6">
        {t("loading.reassurance")}
      </p>
    </div>
  );
}
