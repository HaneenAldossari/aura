import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StarField from "../components/StarField";
import Skeleton from "../components/ui/Skeleton";
import { formatSeasonName } from "../utils/formatSeason";
import ResultsNav, { type Tab } from "./results/ResultsNav";
import OverviewTab from "./results/OverviewTab";
import BeautyTab from "./results/BeautyTab";
import StyleTab from "./results/StyleTab";
import ShopTab, { useLinkChecker } from "./results/ShopTab";
import ChatWidget from "./results/ChatWidget";
import { useResultsData } from "./results/useResultsData";

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const { data, loading } = useResultsData(sessionId);
  // Lives here (not in ShopTab) so the check result survives tab switches
  const linkChecker = useLinkChecker(sessionId);

  if (loading) {
    // Skeleton of the overview: season hero + palette fan area
    return (
      <div className="min-h-screen" style={{ maxWidth: 900, margin: "0 auto", padding: "112px 20px 28px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Skeleton width={140} height={12} style={{ margin: "0 auto 20px" }} />
          <Skeleton width="min(480px, 80%)" height={72} radius={16} style={{ margin: "0 auto 16px" }} />
          <Skeleton width="min(320px, 60%)" height={16} style={{ margin: "0 auto" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 40 }}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} width={64} height={150} radius={12} />
          ))}
        </div>
        <Skeleton width="100%" height={180} radius={16} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p style={{ color: 'var(--text-muted)' }}>Results not found.</p>
        <button onClick={() => navigate("/analyze")} className="hover:underline cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
          Start a new analysis
        </button>
      </div>
    );
  }

  const seasonName = formatSeasonName(data.season);

  return (
    <div className="min-h-screen pb-24 animate-fade-in">
      <StarField maxOpacity={0.45} minDuration={4} durationRange={5} />

      <ResultsNav tab={tab} onTabChange={setTab} seasonName={seasonName} palette={data.palette} />

      <main style={{ maxWidth: tab === "overview" ? 1080 : 760, margin: "0 auto", padding: "28px 20px", paddingTop: tab === "overview" ? "112px" : "140px", transition: "max-width 0.3s ease" }}>
        {/* key={tab} remounts the wrapper so each tab change fades up */}
        <div key={tab} role="tabpanel" className="animate-fade-in-up">
          {tab === "overview" && (
            <OverviewTab
              data={data}
              seasonName={seasonName}
              sessionId={sessionId}
              onContinue={() => { setTab("beauty"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
          )}
          {tab === "beauty" && <BeautyTab makeup={data.makeup} seasonName={seasonName} depth={data.colorDNA?.depth ?? null} />}
          {tab === "style" && <StyleTab data={data} seasonName={seasonName} />}
          {tab === "shop" && <ShopTab palette={data.palette} seasonName={seasonName} checker={linkChecker} />}
        </div>
      </main>

      {/* ==================== FLOATING CHATBOT ==================== */}
      <ChatWidget sessionId={sessionId} seasonName={seasonName} />
    </div>
  );
}
