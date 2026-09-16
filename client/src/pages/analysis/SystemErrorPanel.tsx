import { RefreshCw, ServerCrash } from "lucide-react";

/**
 * Our failure, shown as ours.
 *
 * Deliberately a different component from QualityPanel. A decoder that would not
 * load, a model download that failed, a WASM compile error — none of those say
 * anything about the user's photo, and putting them behind "Better Photos
 * Needed" sends someone off to re-shoot a picture that was fine. That is exactly
 * what happened when the decoder .wasm 404'd to index.html: the user saw
 * "Aborted(CompileError…)" under a heading blaming their photo.
 *
 * The raw error goes to the console, never on screen.
 */
export default function SystemErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-2xl p-6 max-w-lg mx-auto"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
    >
      <div className="flex items-center gap-3 mb-4">
        <ServerCrash size={20} style={{ color: "var(--accent-gold)" }} aria-hidden />
        <h2 className="text-lg" style={{ color: "var(--text-primary)" }}>
          Something went wrong on our side
        </h2>
      </div>

      <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-muted)" }}>
        Your photo is fine — there's nothing you need to change about it.
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2"
        style={{ background: "var(--accent-gold)", color: "var(--bg-base, #10100e)" }}
      >
        <RefreshCw size={16} aria-hidden />
        Try again
      </button>
    </div>
  );
}
