import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useT } from "../../i18n";
import ChatWidget from "./ChatWidget";
import type { AnalysisResult } from "../../lib/types";

/**
 * The way into the stylist chat, in the flow of the page.
 *
 * A floating button in the corner is easy to miss and easy to mistake for
 * support. An entry row where the answers run out says what it is for, and the
 * panel it opens is the same one.
 */
export default function ChatEntry({
  data,
  seasonName,
  sessionId,
}: {
  data: AnalysisResult;
  seasonName: string;
  sessionId?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <section className="ed-section">
      <button
        type="button"
        className="ed-chatentry"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <MessageCircle size={18} aria-hidden />
        <span className="ed-chatentry__text">
          <span className="ed-chatentry__title">{t("results.chat.entryTitle")}</span>
          <span className="ed-chatentry__hint">
            {t("results.chat.entryHint", { season: seasonName })}
          </span>
        </span>
      </button>

      <ChatWidget
        sessionId={sessionId}
        analysis={data}
        seasonName={seasonName}
        open={open}
        onOpenChange={setOpen}
      />
    </section>
  );
}
