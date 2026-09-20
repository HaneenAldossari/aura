import { AlertCircle } from "lucide-react";
import { useT } from "../../i18n";

export default function ErrorPanel({
  errorKind,
  error,
  photoTips,
  onRetry,
}: {
  errorKind: "photo" | "sample";
  error: string | null;
  photoTips: string[];
  onRetry: () => void;
}) {
  const t = useT();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-warm-red/10 flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-warm-red" />
      </div>
      <h2
        className="text-2xl font-bold text-cream mb-3"
        style={{ fontFamily: "Cormorant Garamond, serif" }}
      >
        {t(errorKind === "sample" ? "errors.sampleTitle" : "errors.photoTitle")}
      </h2>
      <p className="text-cream-muted text-center max-w-md mb-6">
        {error}
      </p>

      {photoTips.length > 0 && (
        <div className="bg-espresso-light rounded-xl p-5 border border-gold/10 mb-6 max-w-md w-full">
          <p className="text-gold text-sm font-medium mb-3">
            {t("errors.tipsHeading")}
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
        onClick={onRetry}
        className="px-8 py-3 rounded-xl bg-gold text-espresso font-semibold hover:bg-gold-light transition cursor-pointer"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
