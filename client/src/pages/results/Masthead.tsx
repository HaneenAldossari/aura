import { Link } from "react-router-dom";
import { useT } from "../../i18n";

/**
 * Wordmark left, context right. The gold is spent elsewhere on this screen —
 * "gold is a signal, never a surface" — so the wordmark stays ink.
 */
export default function Masthead({ meta }: { meta?: string }) {
  const t = useT();
  return (
    <header className="ed-masthead">
      <Link to="/" className="ed-wordmark">
        {t("common.brandName")}
      </Link>
      {meta && <span className="ed-masthead__meta ltr-run">{meta}</span>}
    </header>
  );
}
