import { useCallback, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useT } from "../../i18n";
import { readableOn } from "../../lib/contrast";
import { checkLinkImage } from "../../lib/api";
import { getLastCheck, rememberCheck } from "../../lib/checkCache";
import { displayed, shopHeadline, SHOP_HEADLINE_KEY } from "../../lib/bands";
import type { AnalysisResult, LinkCheckResultData } from "../../lib/types";

/** One sentence: the card says one thing, and the rest is behind "Show details". */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  return text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
}

/**
 * The shop check, as a panel so it can live in a tab.
 *
 * The last check is remembered for the session: people switch to Overview to
 * look at their palette and come straight back, and losing the result they
 * just paid for on a tab change is the kind of thing that makes someone stop
 * using a tab.
 */
export default function BeforeYouBuyPanel({
  data,
  resultId,
  seasonName,
}: {
  data: AnalysisResult;
  resultId: string | undefined;
  seasonName: string;
}) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const remembered = getLastCheck(resultId);

  const [result, setResult] = useState<LinkCheckResultData | null>(remembered?.result ?? null);
  const [preview, setPreview] = useState<string | null>(remembered?.preview ?? null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(
    async (file: File) => {
      setChecking(true);
      setError(null);
      setResult(null);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      try {
        const checked = (await checkLinkImage(file, data)) as LinkCheckResultData;
        setResult(checked);
        rememberCheck(resultId, checked, objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("results.shop.checkFailed"));
      } finally {
        setChecking(false);
      }
    },
    [data, resultId, t]
  );

  const palette = data.palette?.best ?? [];
  const nearest = result
    ? palette.find((c) => c.name === result.similarColors?.[0]?.name) ?? palette[0]
    : null;

  if (!result) {
    return (
      <>
        <p className="ed-tagline">{t("results.shop.lede", { season: seasonName })}</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) check(file);
            e.target.value = "";
          }}
        />
        <div
          role="button"
          tabIndex={0}
          className="ed-dropzone"
          aria-label={t("results.shop.dropzoneLabel")}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) check(file);
          }}
        >
          <Camera size={26} aria-hidden style={{ color: "var(--accent)" }} />
          <p className="ed-def__value" style={{ margin: 0 }}>
            {checking ? t("results.shop.checking") : t("results.shop.dropHeading")}
          </p>
          <p className="ed-def__term" style={{ margin: 0 }}>
            {t("results.shop.dropHint")}
          </p>
        </div>
        {error && <p className="ed-note__text" style={{ marginBlockStart: "var(--space-4)" }}>{error}</p>}
      </>
    );
  }

  const headline = shopHeadline(result.matchScore);
  const reason = firstSentence(result.reason);
  const tip = firstSentence(result.tip);
  const reset = () => {
    setResult(null);
    setPreview(null);
    rememberCheck(resultId, null, null);
  };

  return <ShopVerdict result={result} nearest={nearest} photo={preview} headline={headline} reason={reason} tip={tip} onReset={reset} />;
}

/**
 * A shop check, read top to bottom: the photo, the score, the word for that
 * score, why, what to do about it — then the two pieces of evidence, always
 * visible and small: the product's colour against the nearest of yours, and
 * three of yours that are closer.
 *
 * No band legend and no "show details". The legend explained a scale the
 * verdict word already reads out, and a toggle hid the only part of the
 * result a sceptical reader wants to check.
 */
function ShopVerdict({
  result,
  nearest,
  photo,
  headline,
  reason,
  tip,
  onReset,
}: {
  result: LinkCheckResultData;
  nearest: { name: string; hex: string } | null | undefined;
  photo: string | null;
  headline: ReturnType<typeof shopHeadline>;
  reason: string;
  tip: string;
  onReset?: () => void;
}) {
  const t = useT();
  const score = displayed(result.matchScore);

  return (
    <div className="ed-verdictcard" data-headline={headline}>
      {photo && <img src={photo} alt={t("results.shop.uploadedAlt")} className="ed-product" />}

      <div className="ed-verdictcard__body">
        <p
          className="ed-score"
          aria-label={t("results.shop.scoreLabel", { score, verdict: t(SHOP_HEADLINE_KEY[headline]) })}
        >
          <span className="ed-score__value ltr-run">{score}</span>
          <span className="ed-score__of ltr-run"> / 100</span>
        </p>
        <p className="ed-verdict">{t(SHOP_HEADLINE_KEY[headline])}</p>

        {reason && <p className="ed-verdictcard__reason">{reason}</p>}
        {tip && (
          <p className="ed-verdictcard__tip">
            <span style={{ color: "var(--accent)" }}>{t("results.shop.tipLabel")}</span> {tip}
          </p>
        )}

        <div className="ed-evidence">
          <div className="ed-evidence__row">
            <p className="ed-evidence__label">{t("results.shop.against")}</p>
            <div className="ed-compare">
              <span className="ed-compare__half" style={{ background: result.hex, color: readableOn(result.hex) }}>
                {t("results.shop.product")}
              </span>
              {nearest && (
                <span className="ed-compare__half" style={{ background: nearest.hex, color: readableOn(nearest.hex) }}>
                  {nearest.name}
                </span>
              )}
            </div>
          </div>

          {result.similarColors?.length > 0 && (
            <div className="ed-evidence__row">
              <p className="ed-evidence__label">{t("results.shop.closerInPalette")}</p>
              <div className="ed-index__shades">
                {result.similarColors.slice(0, 3).map((c) => (
                  <span className="ed-chip" key={c.hex}>
                    <span className="ed-chip__swatch" style={{ background: c.hex }} aria-hidden />
                    <span className="ed-chip__name">{c.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {onReset && (
          <div className="ed-actions">
            <button type="button" className="ed-link" onClick={onReset}>
              {t("results.shop.checkAnother")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
