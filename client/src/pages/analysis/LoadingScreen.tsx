import { useState, useEffect } from "react";
import {
  Loader2,
  Eye,
  Sparkles,
  Scan,
  Palette,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

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

export default function LoadingScreen({ uploadedPhotos, totalDuration: overrideTotal }: { uploadedPhotos: string[]; totalDuration?: number }) {
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
