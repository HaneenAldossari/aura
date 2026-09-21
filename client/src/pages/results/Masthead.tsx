import { Link } from "react-router-dom";
import { useT } from "../../i18n";

/**
 * Wordmark left, context right. The gold is spent elsewhere on this screen —
 * "gold is a signal, never a surface" — so the wordmark stays ink.
 */
export default function Masthead({ meta, metaShort }: { meta?: string; metaShort?: string }) {
  const t = useT();
  return (
    <header className="ed-masthead">
      <Link to="/" className="ed-wordmark">
        {t("common.brandName")}
      </Link>
      {/* On a phone the wordmark and the full line do not fit side by side, and
          a masthead that wraps pushes everything under it down by a line. The
          short form is the part that carries information: the date. */}
      {meta && (
        <span className={`ed-masthead__meta ltr-run${metaShort ? " ed-masthead__meta--long" : ""}`}>{meta}</span>
      )}
      {metaShort && <span className="ed-masthead__meta ed-masthead__meta--short ltr-run">{metaShort}</span>}
    </header>
  );
}
