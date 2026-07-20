/** Share buttons (WhatsApp). */
export default function ShareSection({ seasonName }: { seasonName: string }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
      {[
        { label: "Share on WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`I'm a ${seasonName}! Discover your color season on Your Aura: ${typeof window !== "undefined" ? window.location.origin : ""}`)}`, external: true },
      ].map((btn) => (
        <a
          key={btn.label}
          href={btn.href}
          target={btn.external ? "_blank" : undefined}
          rel={btn.external ? "noopener noreferrer" : undefined}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "12px 28px",
            background: "transparent",
            border: "0.5px solid rgba(212,175,122,0.4)",
            borderRadius: 0,
            fontFamily: "Inter, sans-serif",
            fontSize: 11,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#D4AF7A",
            textDecoration: "none",
            transition: "all 0.3s ease",
            cursor: "pointer",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#D4AF7A"; e.currentTarget.style.color = "#0D0D0F"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#D4AF7A"; }}
        >
          {btn.label}
        </a>
      ))}
    </div>
  );
}
