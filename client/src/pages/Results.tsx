import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import StarField from "../components/StarField";
import ChatLauncher from "../components/ChatLauncher";
import { formatSeasonName } from "../utils/formatSeason";
import { useT } from "../i18n";
import { useResultsData } from "./results/useResultsData";
import { getCachedPhoto } from "../lib/photoCache";

import Masthead from "./results/Masthead";
import { formatShortDate } from "../lib/formatDate";
import ResultsTabs, { type ResultsTab } from "./results/ResultsTabs";
import SeasonIdentity from "./results/SeasonIdentity";
import ColourDNA from "./results/ColourDNA";
import TraitLine from "./results/TraitLine";
import PreviewCards from "./results/PreviewCards";
import HairNote from "./results/HairNote";
import PaletteGrid from "./results/PaletteGrid";
import MakeupSection from "./results/MakeupSection";
import StyleSection from "./results/StyleSection";
import BeforeYouBuyPanel from "./results/BeforeYouBuyPanel";
import ChatWidget from "./results/ChatWidget";
import { savePalettePng } from "./results/savePalette";
import "./results/results-editorial.css";

const TAB_IDS: ResultsTab[] = ["overview", "beauty", "style", "shop"];

export default function Results() {
  const t = useT();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [params, setParams] = useSearchParams();
  const { data, loading } = useResultsData(sessionId);
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

  // This page never runs an analysis and never writes a result. It used to:
  // the hair note's link re-measured the cached photo under the other hair
  // answer, called /api/analyze a second time and navigate(…, {replace: true})d
  // to the new result — one tap, no confirmation, and the season on screen
  // changed under the reader (Deep Autumn → Light Spring is exactly the
  // hair-counted / hair-excluded pair CLAUDE.md records). A result is immutable
  // once displayed. Changing the hair answer is a new analysis, started from
  // Upload, by pressing Analyse; the old result keeps its id and its URL.

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
            <Link className="ed-button" to="/analyse">
              {t("results.startOver")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const seasonName = formatSeasonName(data.season);
  const analysedOn = formatShortDate(new Date());

  return (
    <div className="ed-page">
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      <div className="ed-shell" style={{ position: "relative", zIndex: 1 }}>
        <Masthead meta={t("results.analysisMeta", { date: analysedOn })} metaShort={analysedOn} />
        <ResultsTabs active={tab} onChange={setTab} />

        {tab === "overview" && (
          <>
            {/* No second-photo banner. `needsSecondPhoto` still arrives in the
                data — it is a suggestion the thresholds behind it have not
                earned the right to make yet (Phase 4), and a banner above the
                result read as the app doubting its own answer. */}
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

                {/* The measurement in words, above the table that evidences it.
                    Most people cannot read "skin 37.5 / 26.6 / 44.9" — but
                    anyone can check "warm, golden" against a mirror, which is
                    the only external test this app has. */}
                <TraitLine data={data} />

                {/* Canonical, not model-written: two people with the same
                    season read the same description of it. */}
                {data.styleShades?.story && <p className="ed-story">{data.styleShades.story}</p>}

                <ColourDNA data={data} />
                {(data.photoCount ?? 1) >= 2 && (
                  <p className="ed-twophoto">{t("results.twoPhotos")}</p>
                )}
                {getCachedPhoto(sessionId) && (
                  <HairNote data={data} onRedo={() => navigate(`/analyse?redo=${sessionId}`)} />
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

                {/* What is behind the other tabs, sampled from this season's
                    own data — a tab bar says a tab exists, not whether it is
                    worth opening. */}
                <PreviewCards data={data} onOpen={setTab} />

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

            {/* Last on the page, on its own. Directly under the twelve it
                broke the pattern: twelve colours that are yours, then six
                that are not, in the same shape, with nothing between them but
                a hairline. Down here it is a footnote with room for names. */}
            {(data.palette?.avoid?.length ?? 0) > 0 && (
              <section className="ed-section ed-avoid" aria-labelledby="avoid-label">
                <h2 className="ed-section__label" id="avoid-label">
                  {t("results.avoidTitle")}
                </h2>
                <hr className="ed-rule" />
                <p className="ed-avoid__note">{t("results.avoidRow")}</p>
                <ul className="ed-avoid__row">
                  {data.palette.avoid.slice(0, 6).map((colour) => (
                    <li key={colour.hex}>
                      <span className="ed-avoid__swatch" style={{ background: colour.hex }} aria-hidden />
                      <span className="ed-avoid__name">{colour.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
