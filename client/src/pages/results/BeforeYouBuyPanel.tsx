import { useCallback, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useT } from "../../i18n";
import { readableOn } from "../../lib/contrast";
import { checkLinkImage } from "../../lib/api";
import { getLastCheck, rememberCheck } from "../../lib/checkCache";
import { displayed, shopHeadline, SHOP_HEADLINE_KEY } from "../../lib/bands";
import type { AnalysisResult, LinkCheckResultData, Verdict } from "../../lib/types";

/** One sentence: the card says one thing, and the rest is behind "Show details". */
function firstSentence(text: string | undefined): string {
  if (!text) return "";
  return text.trim().split(/(?<=[.!?])\s+/)[0] ?? "";
}

/** The model's four bands, printed in the details. The headline uses lib/bands. */
const BANDS: { verdict: Verdict; from: number; to: number }[] = [
  { verdict: "avoid", from: 0, to: 39 },
  { verdict: "maybe", from: 40, to: 64 },
  { verdict: "good", from: 65, to: 84 },
  { verdict: "great", from: 85, to: 100 },
];

const VERDICT_KEY = {
  great: "results.shop.verdictGreat",
  good: "results.shop.verdictGood",
  maybe: "results.shop.verdictMaybe",
  avoid: "results.shop.verdictAvoid",
} as const;

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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const check = useCallback(
    async (file: File) => {
      setChecking(true);
      setError(null);
      setResult(null);
      setDetailsOpen(false);
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

  return (
    <div className="ed-verdictcard" data-headline={headline}>
      {preview && <img src={preview} alt={t("results.shop.uploadedAlt")} className="ed-product" />}

      <div className="ed-verdictcard__body">
        {/* The answer first, in words. The number is the evidence for it, so
            it sits underneath and small: someone holding a jumper in a shop
            wants "suits you", not a 72 they then have to interpret. */}
        <p className="ed-verdict">{t(SHOP_HEADLINE_KEY[headline])}</p>
        <p className="ed-score" aria-label={t("results.shop.scoreLabel", { score: displayed(result.matchScore), verdict: t(SHOP_HEADLINE_KEY[headline]) })}>
          <span className="ed-score__value ltr-run">{displayed(result.matchScore)}</span>
          <span className="ed-score__of ltr-run"> / 100</span>
        </p>

        {reason && <p className="ed-verdictcard__reason">{reason}</p>}
        {tip && (
          <p className="ed-verdictcard__tip">
            <span style={{ color: "var(--accent)" }}>{t("results.shop.tipLabel")}</span> {tip}
          </p>
        )}

        <div className="ed-actions">
          <button
            type="button"
            className="ed-link"
            onClick={() => {
              setResult(null);
              setPreview(null);
              setDetailsOpen(false);
              rememberCheck(resultId, null, null);
            }}
          >
            {t("results.shop.checkAnother")}
          </button>
          <button
            type="button"
            className="ed-link ed-link--quiet"
            aria-expanded={detailsOpen}
            aria-controls="shop-details"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {t(detailsOpen ? "results.shop.hideDetails" : "results.shop.showDetails")}
          </button>
        </div>
      </div>

      {/* The working-out. Closed by default: it is for the reader who wants
          to check the answer, not a toll everyone pays to reach it. */}
      <div className="ed-verdictcard__details" id="shop-details" hidden={!detailsOpen}>
        <p className="ed-def__value" style={{ margin: 0 }}>{result.productName}</p>
        <p className="ed-masthead__meta" style={{ display: "block", whiteSpace: "normal" }}>
          {result.productColor} · <span className="ltr-run">{result.hex}</span>
        </p>

        {result.reason && result.reason !== reason && <p className="ed-tagline">{result.reason}</p>}

        <ol className="ed-bands" aria-label={t("results.shop.bandsLabel")}>
          {BANDS.map((band) => (
            <li
              key={band.verdict}
              className={`ed-band${band.verdict === result.verdict ? " ed-band--on" : ""}`}
            >
              <span className="ltr-run">
                {band.from}–{band.to}
              </span>{" "}
              {t(VERDICT_KEY[band.verdict])}
            </li>
          ))}
        </ol>

        <p className="ed-section__label" style={{ marginBlockStart: "var(--space-5)" }}>
          {t("results.shop.against")}
        </p>
        <div className="ed-compare">
          <span
            className="ed-compare__half"
            style={{ background: result.hex, color: readableOn(result.hex) }}
          >
            {t("results.shop.product")}
          </span>
          {nearest && (
            <span
              className="ed-compare__half"
              style={{ background: nearest.hex, color: readableOn(nearest.hex) }}
            >
              {t("results.shop.yours")}
            </span>
          )}
        </div>
        {nearest && (
          <p className="ed-masthead__meta" style={{ display: "block", marginBlockStart: "var(--space-2)", whiteSpace: "normal" }}>
            {nearest.name} · <span className="ltr-run">{nearest.hex.replace("#", "")}</span>{" "}
            {t("results.shop.nearest")}
          </p>
        )}

        {result.similarColors?.length > 0 && (
          <>
            <p className="ed-section__label" style={{ marginBlockStart: "var(--space-5)" }}>
              {t("results.shop.closerInPalette")}
            </p>
            <div className="ed-index__shades">
              {result.similarColors.slice(0, 3).map((c) => (
                <span className="ed-chip" key={c.hex}>
                  <span className="ed-chip__swatch" style={{ background: c.hex }} aria-hidden />
                  <span className="ed-chip__name">{c.name}</span>
                  <span className="ed-chip__finish ltr-run">{c.hex.replace("#", "")}</span>
                </span>
              ))}
            </div>
          </>
        )}

        <p className="ed-skip">{t("results.shop.approximate")}</p>
      </div>
    </div>
  );
}
