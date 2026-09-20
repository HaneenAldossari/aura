import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import StarField from "../components/StarField";
import ChatLauncher from "../components/ChatLauncher";
import { formatSeasonName } from "../utils/formatSeason";
import { useT } from "../i18n";
import { useResultsData } from "./results/useResultsData";
import { getCachedPhoto, cachePhoto } from "../lib/photoCache";
import { newResultId, saveResult } from "../lib/resultStore";
import { measureBytes } from "../lib/measure";
import { analyzeMeasured } from "../lib/api";
import type { HairStatus } from "../lib/types";

import Masthead from "./results/Masthead";
import ResultsTabs, { type ResultsTab } from "./results/ResultsTabs";
import SeasonIdentity from "./results/SeasonIdentity";
import SecondPhotoNudge from "./results/SecondPhotoNudge";
import ColourDNA from "./results/ColourDNA";
import HairNote from "./results/HairNote";
import PaletteGrid from "./results/PaletteGrid";
import MakeupSection from "./results/MakeupSection";
import StyleSection from "./results/StyleSection";
import BeforeYouBuyPanel from "./results/BeforeYouBuyPanel";
import ChatWidget from "./results/ChatWidget";
import { savePalettePng } from "./results/savePalette";
import "./results/results-editorial.css";

/** natural → coloured → not visible → natural. */
const NEXT_HAIR: Record<HairStatus, HairStatus> = {
  natural: "dyed",
  dyed: "covered",
  covered: "natural",
};

const TAB_IDS: ResultsTab[] = ["overview", "beauty", "style", "shop"];

export default function Results() {
  const t = useT();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [params, setParams] = useSearchParams();
  const { data, loading } = useResultsData(sessionId);
  const [rerunning, setRerunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // The tab lives in the URL so it survives a reload and can be linked to —
  // "look at the Beauty tab" should be a link, not an instruction.
  const requested = params.get("tab") as ResultsTab | null;
  const tab: ResultsTab = requested && TAB_IDS.includes(requested) ? requested : "overview";
  const setTab = (next: ResultsTab) => {
    setParams(next === "overview" ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /**
   * Re-analyse the same pixels under a different hair answer.
   *
   * The photo is only in memory, so this is unavailable after a reload — the
   * control hides itself rather than failing when pressed.
   */
  const changeHairAnswer = useCallback(async () => {
    const photo = getCachedPhoto(sessionId);
    if (!photo || rerunning) return;
    const next = NEXT_HAIR[photo.hairStatus];
    setRerunning(true);
    try {
      const outcome = await measureBytes(photo.bytes, next);
      if (outcome.kind !== "measured") {
        // The same pixels passed the gate minutes ago, so this is
        // infrastructure, not the photo. Leave the current result standing.
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

  if (loading || !data) {
    return (
      <div className="ed-page">
        <div className="ed-shell">
          <Masthead />
          <p className="ed-tagline">{loading ? t("common.loading") : t("results.notFound")}</p>
          {!loading && (
            <Link className="ed-button" to="/analyze">
              {t("results.startOver")}
            </Link>
          )}
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
        <ResultsTabs active={tab} onChange={setTab} />

        {tab === "overview" && (
          <>
            {data.needsSecondPhoto && (
              <SecondPhotoNudge onAdd={() => navigate("/analyze?second=1")} />
            )}

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
                <section className="ed-section">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "var(--space-3)",
                    }}
                  >
                    <h2 className="ed-section__label">{t("results.palette.title")}</h2>
                    <span className="ed-masthead__meta">{t("results.palette.hint")}</span>
                  </div>
                  <hr className="ed-rule" />
                  <PaletteGrid colours={data.palette?.best ?? []} />
                  <div className="ed-actions" style={{ marginBlockStart: "var(--space-3)" }}>
                    <button
                      type="button"
                      className="ed-link"
                      onClick={savePalette}
                      disabled={saving}
                    >
                      {saving ? t("results.palette.saving") : t("results.palette.save")}
                    </button>
                  </div>
                </section>

                {/* Balances the column, and puts the thing people come back
                    for in front of them rather than behind a tab. */}
                <button type="button" className="ed-buycard" onClick={() => setTab("shop")}>
                  <p className="ed-buycard__title">{t("results.beforeYouBuy")}</p>
                  <p className="ed-buycard__body">{t("results.buyCard.body")}</p>
                  <span className="ed-buycard__cta">{t("results.buyCard.cta")} →</span>
                </button>

                <button
                  type="button"
                  className="ed-chatentry"
                  style={{ marginBlockStart: "var(--space-4)" }}
                  onClick={() => setChatOpen(true)}
                  aria-haspopup="dialog"
                >
                  <span className="ed-chatentry__text">
                    <span className="ed-chatentry__title">{t("results.chat.entryTitle")}</span>
                    <span className="ed-chatentry__hint">
                      {t("results.chat.entryHint", { season: seasonName })}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "beauty" && <MakeupSection data={data} />}
        {tab === "style" && <StyleSection data={data} />}
        {tab === "shop" && (
          <BeforeYouBuyPanel data={data} resultId={sessionId} seasonName={seasonName} />
        )}
      </div>

      <ChatLauncher onOpen={() => setChatOpen(true)} />
      <ChatWidget
        sessionId={sessionId}
        analysis={data}
        seasonName={seasonName}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </div>
  );
}
