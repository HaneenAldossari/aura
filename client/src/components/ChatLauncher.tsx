import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useT } from "../i18n";

/**
 * The floating way into the chat, on every screen.
 *
 * Hidden while a field has focus. On a phone the keyboard takes most of the
 * viewport, and a button pinned above the safe area lands directly on top of
 * whatever is being typed — worse than no button at all. Focus is watched on
 * the document rather than wired through each form, so a field added later is
 * covered without anyone remembering to.
 */
export default function ChatLauncher({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || node.isContentEditable;
    };
    const onFocus = (e: FocusEvent) => setTyping(isField(e.target));
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    // A field already focused when this mounts would otherwise be missed.
    setTyping(isField(document.activeElement));
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  return (
    <button
      type="button"
      className="ed-chatfab"
      hidden={typing}
      onClick={onOpen}
      aria-label={t("results.chat.openLabel")}
      aria-haspopup="dialog"
    >
      <MessageCircle size={22} aria-hidden />
    </button>
  );
}
