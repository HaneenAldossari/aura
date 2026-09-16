import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { checkLinkImage } from "../../lib/api";
import type { ColorSwatch, Palette } from "../../lib/types";
import { LinkCheckResult } from "../../components/LinkCheckResult";
import SplitText from "../../components/SplitText";
import type { AnalysisResult } from "../../lib/types";

/**
 * Image-checker state. Lives at the Results level (not inside ShopTab) so
 * the result survives switching tabs — exactly as in the original page.
 */
export function useLinkChecker(analysis: AnalysisResult | null) {
  const [linkResult, setLinkResult] = useState<Record<string, any> | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setLinkLoading(true);
    setLinkError(null);
    setLinkResult(null);
    try {
      if (!analysis) throw new Error('No analysis loaded');
      const res = await checkLinkImage(file, analysis);
      setLinkResult(res);
    } catch (err: any) {
      setLinkError(err.message || 'Image check failed');
    } finally {
      setLinkLoading(false);
    }
  };

  const reset = () => { setLinkResult(null); setSelectedImage(null); setImagePreview(null); };

  return { linkResult, linkLoading, linkError, selectedImage, imagePreview, fileInputRef, handleImageSelect, reset };
}

export type LinkChecker = ReturnType<typeof useLinkChecker>;

/** Shop tab: the "Before You Buy" image checker. */
export default function ShopTab({
  palette,
  seasonName,
  checker,
}: {
  palette: Palette;
  seasonName: string;
  checker: LinkChecker;
}) {
  const { linkResult, linkLoading, linkError, imagePreview, fileInputRef, handleImageSelect, reset } = checker;

  return (
    <div className="animate-slide-up" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="mb-8">
        <SplitText key="shop-heading" text="Before You Buy" className="text-3xl font-bold mb-2" tag="h1" delay={30} duration={0.5} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upload a photo of any item — we'll tell you if it matches your {seasonName} palette.</p>
      </div>

      {/* Palette quick-view */}
      {palette?.best?.length > 0 && (
        <div className="mb-6" style={{ padding: "12px 16px", borderRadius: "12px", background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--accent-gold)", marginBottom: "8px" }}>Your palette</p>
          <div style={{ display: "flex", gap: "10px" }}>
            {palette.best.slice(0, 5).map((c: ColorSwatch) => (
              <div
                key={c.hex}
                style={{
                  position: "relative",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  backgroundColor: c.hex,
                  boxShadow: "inset 0 2px 8px rgba(0,0,0,0.25), inset 0 -1px 3px rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.3)",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div style={{ position: "absolute", top: "12%", left: "15%", width: "30%", height: "21%", borderRadius: "50%", background: "radial-gradient(ellipse at center, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)", pointerEvents: "none" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image upload drop zone */}
      {!linkResult && !linkLoading && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageSelect(file);
              e.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a product photo to check against your palette"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={e => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && /\.(jpe?g|png|webp)$/i.test(file.name)) handleImageSelect(file);
            }}
            className="rounded-2xl p-10 mb-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition hover:opacity-80"
            style={{ background: 'var(--bg-card)', border: '2px dashed var(--border-accent)', minHeight: '180px' }}
          >
            <Camera className="w-8 h-8" style={{ color: 'var(--accent-gold)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Upload a photo of the item</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tap to browse or drag & drop — JPG, PNG, or WebP</p>
          </div>

        </>
      )}

      {/* Loading state with image preview */}
      {linkLoading && (
        <div className="rounded-xl p-8 text-center space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}>
          {imagePreview && (
            <img src={imagePreview} alt="Uploaded item" className="w-32 h-32 object-cover rounded-xl mx-auto" />
          )}
          <p className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Analyzing colors...</p>
        </div>
      )}

      {linkResult && !linkLoading && (
        <LinkCheckResult
          result={linkResult as any}
          onReset={reset}
        />
      )}

      {linkError && (
        <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(212,175,122,0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{linkError}</div>
      )}
    </div>
  );
}
