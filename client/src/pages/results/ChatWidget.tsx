import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { streamChatMessage } from "../../lib/api";
import type { AnalysisResult } from "../../lib/types";
import type { ChatMessage } from "../../lib/types";
import IconButton from "../../components/ui/IconButton";
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
}: {
  /** Local key for chat history only — the API is stateless. */
  sessionId: string | undefined;
  /** Sent with every turn, since there is no session for the server to look up. */
  analysis: AnalysisResult;
  seasonName: string;
}) {
  const t = useT();
  const [chatOpen, setChatOpen] = useState(false);
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

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !sessionId || chatLoading) return;
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
    } catch {
      if (!streamed) {
        setChatMessages([
          ...newMessages,
          { role: "assistant", content: t("results.chat.failed") },
        ]);
      }
    }
    clearTimeout(searchTimer);
    setChatLoading(false);
    setChatSearchPhase(false);
  }, [sessionId, chatLoading, chatMessages]);

  const handleSendChat = () => sendMessage(chatInput);

  return (
    <>
      {!chatOpen && (
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
          className={
            isNarrow
              ? "fixed inset-x-0 bottom-0 h-[70dvh] rounded-t-2xl shadow-2xl flex flex-col z-50 animate-bounce-in overflow-hidden"
              : "fixed bottom-6 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] rounded-2xl shadow-2xl flex flex-col z-50 animate-bounce-in overflow-hidden"
          }
          role="dialog"
          aria-label={t("results.chat.panelLabel")}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(212,175,122,0.12)' }}><Sparkles className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} /></div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t("results.chat.titleWithSeason", { season: seasonName })}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t("results.chat.subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMessages.length > 0 && (
                <button
                  onClick={() => setChatMessages([])}
                  className="text-xs px-2 py-1 rounded-lg transition cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {t("results.chat.clear")}
                </button>
              )}
              <IconButton aria-label={t("results.chat.closeLabel")} onClick={() => setChatOpen(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></IconButton>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" aria-live="polite">
            {chatMessages.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-xl rounded-tl-sm p-3" style={{ background: 'rgba(212,175,122,0.12)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {t("results.chat.greeting", { season: seasonName })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((key) => (
                    <button key={key} onClick={() => sendMessage(t(key))} className="px-3 py-1.5 rounded-full text-xs transition cursor-pointer" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl p-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                }`} style={msg.role === "user" ? { background: 'var(--accent-gold)', color: 'var(--text-on-accent)' } : { background: 'rgba(212,175,122,0.12)', color: 'var(--text-primary)' }}>
                  {msg.role === "assistant" ? renderChatContent(msg.content) : msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-xl rounded-bl-sm px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(212,175,122,0.12)' }}>
                  {chatSearchPhase ? (
                    <>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t("results.chat.searching")}</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-gold)', animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t("results.chat.thinking")}</span>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-gold)', animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                placeholder={t("results.chat.placeholder")}
                aria-label={t("results.chat.inputLabel")}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
              <IconButton
                aria-label={t("results.chat.sendLabel")}
                onClick={handleSendChat}
                disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 disabled:opacity-30"
                style={{ background: 'var(--accent-gold)', color: 'var(--text-on-accent)', borderRadius: 12 }}
              >
                <Send className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
