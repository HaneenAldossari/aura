import { useCallback, useEffect, useRef, useState } from "react";
import { DailyLimitError, dailyLimit, remainingToday } from "../../lib/dailyCounter";
import { MessageCircle, Send, X } from "lucide-react";
import { streamChatMessage } from "../../lib/api";
import type { AnalysisResult } from "../../lib/types";
import type { ChatMessage } from "../../lib/types";
import { useT, type Key } from "../../i18n";

/* Starter prompts, as keys — the question is sent to the model in whatever
   locale the user is reading, which is the language they expect a reply in. */
const quickQuestions: Key[] = [
  "results.chat.suggestion1",
  "results.chat.suggestion2",
  "results.chat.suggestion3",
  "results.chat.suggestion4",
  "results.chat.suggestion5",
];

function loadHistory(sessionId: string | undefined): ChatMessage[] {
  if (!sessionId) return [];
  try {
    const raw = sessionStorage.getItem(`aura-chat-${sessionId}`);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** Floating chatbot: launcher button + panel + quick questions + send logic.
 * History persists per session in sessionStorage; responses stream in live.
 * Renders as a bottom sheet on small screens. */
export default function ChatWidget({
  sessionId,
  analysis,
  seasonName,
  open,
  onOpenChange,
}: {
  /** Local key for chat history only — the API is stateless. */
  sessionId: string | undefined;
  /** Sent with every turn, since there is no session for the server to look up. */
  analysis: AnalysisResult;
  seasonName: string;
  /** Controlled mode: Results drives this from its own entry row. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useT();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = open !== undefined;
  const chatOpen = controlled ? open : uncontrolledOpen;
  const setChatOpen = (next: boolean) =>
    controlled ? onOpenChange?.(next) : setUncontrolledOpen(next);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    loadHistory(sessionId)
  );
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSearchPhase, setChatSearchPhase] = useState(false);
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" && window.innerWidth < 640
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Persist history so closing the panel (or switching tabs) keeps the thread
  useEffect(() => {
    if (!sessionId) return;
    try {
      sessionStorage.setItem(`aura-chat-${sessionId}`, JSON.stringify(chatMessages));
    } catch {
      // storage full/blocked — chat still works, just unpersisted
    }
  }, [chatMessages, sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const cleanChat = (text: string): string => {
    return text
      // Keep **bold** intact — rendered separately in JSX
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/gs, '$1') // strip italic *text*
      .replace(/_{2}(.+?)_{2}/gs, '$1')
      .replace(/_(.+?)_/gs, '$1')
      .replace(/#{1,6}\s+(.+)/g, '$1')
      .replace(/^[\-\*\+]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const renderChatContent = (text: string) => {
    // Split on **bold** markers and render bold segments as <strong>
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
    );
  };

  // What is left of today's messages. The server counts for real; this is the
  // browser's matching copy (lib/dailyCounter.ts), corrected by every response.
  const [left, setLeft] = useState(() => remainingToday("chat"));

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId || chatLoading || left <= 0) return;
    const msg = text.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setChatSearchPhase(false);

    const searchTimer = setTimeout(() => setChatSearchPhase(true), 1500);
    let streamed = false;

    try {
      const response = await streamChatMessage(analysis, newMessages, (partial) => {
        // First delta: replace the typing indicator with a live message bubble
        streamed = true;
        clearTimeout(searchTimer);
        setChatLoading(false);
        setChatSearchPhase(false);
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: cleanChat(partial) },
        ]);
      });
      setChatMessages([...newMessages, { role: "assistant", content: cleanChat(response) }]);
    } catch (err) {
      if (err instanceof DailyLimitError) {
        // Our own limit, in the server's own words — not a failure to apologise for.
        setChatMessages([...newMessages, { role: "assistant", content: err.message }]);
      } else if (!streamed) {
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: t("results.chat.failed") },
        ]);
      }
    }
    clearTimeout(searchTimer);
    setChatLoading(false);
    setChatSearchPhase(false);
    setLeft(remainingToday("chat"));
  }, [sessionId, chatLoading, chatMessages, left]);

  const handleSendChat = () => sendMessage(chatInput);

  return (
    <>
      {!chatOpen && !controlled && (
        <button
          onClick={() => setChatOpen(true)}
          aria-label={t("results.chat.openLabel")}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition cursor-pointer animate-bounce-in z-50"
          style={{ background: 'var(--accent-gold)', color: 'var(--text-on-accent)' }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {chatOpen && (
        <div
          className={`ed-chat${isNarrow ? " ed-chat--sheet" : ""}`}
          role="dialog"
          aria-label={t("results.chat.panelLabel")}
        >
          <header className="ed-chat__head">
            <div>
              <p className="ed-chat__title">
                {t("results.chat.titleWithSeason", { season: seasonName })}
              </p>
              <p className="ed-chat__sub">{t("results.chat.subtitle")}</p>
            </div>
            <div className="ed-chat__actions">
              {chatMessages.length > 0 && (
                <button type="button" className="ed-link" onClick={() => setChatMessages([])}>
                  {t("results.chat.clear")}
                </button>
              )}
              <button
                type="button"
                className="ed-chat__close"
                aria-label={t("results.chat.closeLabel")}
                onClick={() => setChatOpen(false)}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
          </header>

          <div className="ed-chat__log" aria-live="polite">
            {chatMessages.length === 0 && (
              <div className="space-y-3">
                <div className="ed-msg ed-msg--assistant">
                  <p style={{ margin: 0 }}>
                    {t("results.chat.greeting", { season: seasonName })}
                  </p>
                </div>
                <div className="ed-chat__suggestions">
                  {quickQuestions.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="ed-chat__suggestion"
                      onClick={() => sendMessage(t(key))}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`ed-msg ed-msg--${msg.role}`}>
                {msg.role === "assistant" ? renderChatContent(msg.content) : msg.content}
              </div>
            ))}

            {chatLoading && (
              <p className="ed-chat__status">
                {chatSearchPhase ? t("results.chat.searching") : t("results.chat.thinking")}
                <span className="ed-chat__dots" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </span>
              </p>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="ed-chat__compose">
            <div className="ed-chat__row">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                placeholder={t("results.chat.placeholder")}
                aria-label={t("results.chat.inputLabel")}
                className="ed-chat__input"
              />
              <button
                type="button"
                className="ed-chat__send"
                aria-label={t("results.chat.sendLabel")}
                onClick={handleSendChat}
                disabled={!chatInput.trim() || chatLoading || left <= 0}
              >
                <Send size={16} aria-hidden />
              </button>
            </div>
            <p className="ed-chat__left" aria-live="polite">
              {left > 0
                ? t("results.chat.leftToday", { n: left, limit: dailyLimit("chat") })
                : t("results.chat.noneLeft", { limit: dailyLimit("chat") })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
