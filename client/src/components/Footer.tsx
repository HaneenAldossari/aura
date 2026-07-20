/**
 * Shared footer. `compact` renders the small single-line variant used on
 * Results; the default renders the brand footer used on Home.
 */
export default function Footer({ compact = false }: { compact?: boolean }) {
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
        &copy; {year} Your Aura &middot; AI Color Analysis &middot; 12 Season System
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
        <span style={{ color: "var(--accent-gold)" }}>your</span> Aura
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
        Created by Haneen · AI Color Analysis · {year}
      </p>
    </footer>
  );
}
