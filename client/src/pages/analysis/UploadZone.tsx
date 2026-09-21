import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useT } from "../../i18n";

/**
 * The dropzone, and the chosen photo in its place.
 *
 * Deliberately plain: this is the one screen where nothing should compete with
 * the decision to pick a file. The preview replaces the zone rather than
 * appearing beside it, so there is never a question of which photo is in play.
 */
export default function UploadZone({
  preview,
  onFileSelect,
  onRemove,
}: {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement | null>(null);
  const [over, setOver] = useState(false);

  if (preview) {
    return (
      <div className="an-preview">
        <img className="an-preview__img" src={preview} alt={t("analysis.upload.previewAlt")} />
        <button
          type="button"
          className="an-preview__remove"
          onClick={onRemove}
          aria-label={t("analysis.upload.remove")}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={t("analysis.upload.dropzoneLabel")}
        className={`an-drop${over ? " an-drop--over" : ""}`}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFileSelect(file);
        }}
      >
        <p className="an-drop__title">{t("analysis.choosePhoto")}</p>
        <p className="an-drop__hint">{t("analysis.dropHint")}</p>
        {/* Nested in the zone's click target, so it is decorative to the
            keyboard — the zone itself is the control. */}
        <span className="an-browse" aria-hidden>
          {t("analysis.browse")}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
