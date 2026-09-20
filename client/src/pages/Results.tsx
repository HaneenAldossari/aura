import { useCallback, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import StarField from "../components/StarField";
import { formatSeasonName } from "../utils/formatSeason";
import { useT } from "../i18n";
import { useResultsData } from "./results/useResultsData";
import { getCachedPhoto, cachePhoto } from "../lib/photoCache";
import { newResultId, saveResult } from "../lib/resultStore";
import { measureBytes } from "../lib/measure";
import { analyzeMeasured } from "../lib/api";
import type { HairStatus } from "../lib/types";

import Masthead from "./results/Masthead";
import SeasonIdentity from "./results/SeasonIdentity";
import SecondPhotoNudge from "./results/SecondPhotoNudge";
import ColourDNA from "./results/ColourDNA";
import HairNote from "./results/HairNote";
import PaletteGrid from "./results/PaletteGrid";
import MakeupSection from "./results/MakeupSection";
import StyleSection from "./results/StyleSection";
import ChatEntry from "./results/ChatEntry";
import { savePalettePng } from "./results/savePalette";
import "./results/results-editorial.css";

/** natural → coloured → not visible → natural. */
const NEXT_HAIR: Record<HairStatus, HairStatus> = {
  natural: "dyed",
  dyed: "covered",
  covered: "natural",
};

/**
 * One scrolling page: identity, then makeup, then style.
 *
 * The tab bar is gone. Tabs hid two thirds of the answer behind a control most
 * people never touched, and the sections read in a natural order — who you are,
 * then what to put on your face, then what to wear.
 */
export default function Results() {
  const t = useT();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data, loading } = useResultsData(sessionId);
  const [rerunning, setRerunning] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Re-analyse the same pixels under a different hair answer.
   *
   * The photo is only in memory, so this is unavailable after a reload — the
   * button hides itself rather than failing when the user presses it.
   */
  const changeHairAnswer = useCallback(async () => {
    const photo = getCachedPhoto(sessionId);
    if (!photo || rerunning) return;
    const next = NEXT_HAIR[photo.hairStatus];
    setRerunning(true);
    try {
      const outcome = await measureBytes(photo.bytes, next);
      if (outcome.kind !== "measured") {
        // The same pixels passed the gate minutes ago, so this is infrastructure
        // rather than the photo. Leave the current result standing and say so.
        console.error("[aura] re-analysis failed:", outcome);
        return;
      }
      const { result } = await analyzeMeasured(outcome.upload.bytes, outcome.features.forScoring);
      const id = newResultId();
      saveResult(id, result);
      cachePhoto(id, photo.bytes, next);
      navigate(`/results/${id}`, { replace: true });
    } catch (err) {
      console.error("[aura] re-analysis failed:", err);
    } finally {
      setRerunning(false);
    }
  }, [sessionId, rerunning, navigate]);

  const savePalette = useCallback(async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      await savePalettePng(
        formatSeasonName(data.season),
        data.palette?.best ?? [],
        t("common.brandFull")
      );
    } finally {
      setSaving(false);
    }
  }, [data, saving, t]);

  if (loading) {
    return (
      <div className="ed-page">
        <div className="ed-shell">
          <Masthead />
          <p className="ed-tagline">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ed-page">
        <div className="ed-shell">
          <Masthead />
          <p className="ed-tagline">{t("results.notFound")}</p>
          <Link className="ed-button" to="/analyze">
            {t("results.startOver")}
          </Link>
        </div>
      </div>
    );
  }

  const seasonName = formatSeasonName(data.season);
  const analysedOn = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="ed-page">
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      <div className="ed-shell" style={{ position: "relative", zIndex: 1 }}>
        <Masthead meta={t("results.analysisMeta", { date: analysedOn })} />

        {data.needsSecondPhoto && (
          <SecondPhotoNudge onAdd={() => navigate("/analyze?second=1")} />
        )}

        {/* ── Overview ── */}
        <div className="ed-split">
          <div>
            <SeasonIdentity
              seasonName={seasonName}
              confidence={typeof data.confidence === "number" ? data.confidence : null}
              secondarySeason={
                data.secondarySeason ? formatSeasonName(data.secondarySeason) : undefined
              }
              tagline={data.seasonTagline}
              sessionId={sessionId}
            />

            <ColourDNA data={data} />

            {getCachedPhoto(sessionId) && (
              <HairNote data={data} onChange={changeHairAnswer} rerunning={rerunning} />
            )}
          </div>

          <div>
            <section className="ed-section" aria-labelledby="palette-label">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: "var(--space-3)",
                }}
              >
                <h2 className="ed-section__label" id="palette-label">
                  {t("results.palette.title")}
                </h2>
                <span className="ed-masthead__meta">{t("results.palette.hint")}</span>
              </div>
              <hr className="ed-rule" />
              <PaletteGrid colours={data.palette?.best ?? []} />
              <div className="ed-actions" style={{ marginBlockStart: "var(--space-3)" }}>
                <button type="button" className="ed-link" onClick={savePalette} disabled={saving}>
                  {saving ? t("results.palette.saving") : t("results.palette.save")}
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* ── Makeup ── */}
        <MakeupSection data={data} />

        {/* ── Style ── */}
        <StyleSection data={data} />

        <ChatEntry data={data} seasonName={seasonName} sessionId={sessionId} />

        <div className="ed-actions">
          <Link className="ed-button" to={`/before-you-buy/${sessionId}`}>
            {t("results.beforeYouBuy")}
          </Link>
        </div>
      </div>
    </div>
  );
}
