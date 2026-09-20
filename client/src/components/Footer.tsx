import { useT } from "../i18n";
/**
 * Shared footer. `compact` renders the small single-line variant used on
 * Results; the default renders the brand footer used on Home.
 */
export default function Footer({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const year = new Date().getFullYear();

  if (compact) {
    return (
      <p
        style={{
          fontSize: 10,
          color: "rgba(184,176,164,0.4)",
          marginTop: 16,
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          textAlign: "center",
        }}
      >
        &copy; {year} {t("common.brandFull")} &middot; {t("common.tagline")} &middot; {t("common.seasonSystem")}
      </p>
    );
  }

  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-color)",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: "20px",
          color: "var(--text-secondary)",
          margin: "0 0 8px",
        }}
      >
        <span style={{ color: "var(--accent-gold)" }}>{t("common.brandPrefix")}</span>{" "}
        {t("common.brandName")}
      </p>
      <p
        style={{
          fontSize: "11px",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          margin: 0,
          opacity: 0.7,
        }}
      >
        {t("common.createdBy")} · {t("common.tagline")} · {year}
      </p>
    </footer>
  );
}
