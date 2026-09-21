import { Link } from "react-router-dom";
import { useT } from "../../i18n";

export default function ClosingCta() {
  const t = useT();

  return (
    <section className="lp-section lp-close" aria-labelledby="lp-close-title">
      <div className="lp-close__copy">
        <h2 className="lp-h2 lp-close__title" id="lp-close-title">
          {t("home.landing.closeLead")} <em>{t("home.landing.closeAccent")}</em>
          {t("home.landing.closeMark")}
        </h2>
        <p className="lp-close__lede">{t("home.landing.closeLede")}</p>
        <Link className="cta cta--primary" to="/analyse">
          {t("home.ctaPrimary2")}
        </Link>
      </div>
    </section>
  );
}
