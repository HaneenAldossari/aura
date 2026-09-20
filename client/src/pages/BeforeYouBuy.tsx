import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { useT } from "../i18n";
import { formatSeasonName } from "../utils/formatSeason";
import { readableOn } from "../lib/contrast";
import { checkLinkImage } from "../lib/api";
import { useResultsData } from "./results/useResultsData";
import Masthead from "./results/Masthead";
import type { LinkCheckResultData, Verdict } from "../lib/types";
import "./results/results-editorial.css";

/** The bands the design prints under the score, and the score they cover. */
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
 * Its own route, not a tab.
 *
 * It is the one thing here a person comes back for without re-reading their
 * result, so it needs a URL — and pinning it to the analysis id keeps the
 * palette it scores against unambiguous.
 */
export default function BeforeYouBuy() {
  const t = useT();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data } = useResultsData(sessionId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState<LinkCheckResultData | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(
    async (file: File) => {
      if (!data) return;
      setChecking(true);
      setError(null);
      setResult(null);
      setPreview(URL.createObjectURL(file));
      try {
        setResult((await checkLinkImage(file, data)) as LinkCheckResultData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("results.shop.checkFailed"));
      } finally {
        setChecking(false);
      }
    },
    [data, t]
  );

  const reset = () => {
    setResult(null);
    setPreview(null);
    setError(null);
  };

  const seasonName = data ? formatSeasonName(data.season) : "";
  const palette = data?.palette?.best ?? [];
  const nearest = result
    ? palette.find((c) => c.name === result.similarColors?.[0]?.name) ?? palette[0]
    : null;

  return (
    <div className="ed-page">
      <div className="ed-shell">
        <Masthead meta={seasonName ? t("results.shop.meta", { season: seasonName }) : undefined} />

        <h1 className="ed-season" style={{ fontSize: "clamp(38px, 7vw, 64px)" }}>
          {t("results.shop.title")}
        </h1>

        {!data && <p className="ed-tagline">{t("results.notFound")}</p>}

        {data && !result && (
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

            {error && (
              <p className="ed-note__text" style={{ marginBlockStart: "var(--space-4)" }}>
                {error}
              </p>
            )}
          </>
        )}

        {data && result && (
          <div className="ed-split">
            <div>
              {preview && (
                <img src={preview} alt={t("results.shop.uploadedAlt")} className="ed-product" />
              )}
              <p className="ed-def__value" style={{ marginBlockStart: "var(--space-3)" }}>
                {result.productName}
              </p>
              <p className="ed-masthead__meta">
                {result.productColor} · <span className="ltr-run">{result.hex}</span>
              </p>
            </div>

            <div>
              <p className="ed-score">
                <span className="ed-score__value ltr-run">{result.matchScore}</span>
                <span className="ed-score__of ltr-run">/100</span>
              </p>
              <p className="ed-verdict">{t(VERDICT_KEY[result.verdict])}</p>

              {result.reason && <p className="ed-tagline">{result.reason}</p>}
              {result.tip && (
                <p className="ed-note__text">
                  <span style={{ color: "var(--accent)" }}>{t("results.shop.tipLabel")}</span>{" "}
                  {result.tip}
                </p>
              )}

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

              {/* Product colour against the nearest thing in their palette. */}
              <p className="ed-section__label" style={{ marginBlockStart: "var(--space-5)" }}>
                {t("results.shop.against")}
              </p>
              <div className="ed-compare">
                <span className="ed-compare__half" style={{ background: result.hex, color: readableOn(result.hex) }}>
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
                <p className="ed-masthead__meta" style={{ display: "block", marginBlockStart: "var(--space-2)" }}>
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
                      <span
                        key={c.hex}
                        className="ed-bar__swatch"
                        style={{ background: c.hex, color: readableOn(c.hex) }}
                      >
                        <span className="ed-bar__name">{c.name}</span>
                        <span className="ed-bar__finish ltr-run">{c.hex.replace("#", "")}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

              <p className="ed-skip">{t("results.shop.approximate")}</p>

              <div className="ed-actions">
                <button type="button" className="ed-link" onClick={reset}>
                  {t("results.shop.checkAnother")}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="ed-actions">
          <Link className="ed-link" to={`/results/${sessionId}`}>
            {t("results.backToResults")}
          </Link>
        </div>
      </div>
    </div>
  );
}
