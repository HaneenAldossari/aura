import { useState } from "react";
import type { ColorSwatch } from "../../lib/types";
import { useT } from "../../i18n";

/**
 * "Worth avoiding" — a dominant panel of the season's clashing colors.
 * Each chip is slashed through; hover/focus reveals why it clashes.
 */
export default function AvoidSection({ avoid }: { avoid: ColorSwatch[] }) {
  const t = useT();
  const [active, setActive] = useState<number | null>(null);
  const colors = avoid.slice(0, 6);
  if (colors.length === 0) return null;

  const activeReason =
    active !== null ? colors[active]?.reason || colors[active]?.note : null;

  return (
    <section
      style={{
        marginBottom: 72,
        borderRadius: 20,
        border: "1px solid rgba(224,85,85,0.18)",
        background:
          "linear-gradient(180deg, rgba(224,85,85,0.05) 0%, var(--bg-card) 60%)",
        padding: "32px 28px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 6 }}>
        <h2
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 32,
            fontWeight: 300,
            color: "#F2EEE8",
            margin: 0,
            whiteSpace: "nowrap",
          }}
        >
          {t("results.avoid.titleLead")}{" "}
          <span style={{ fontStyle: "italic", color: "var(--color-error)" }}>
            {t("results.avoid.titleAccent")}
          </span>
        </h2>
        <div style={{ flex: 1, height: 0.5, background: "rgba(224,85,85,0.2)" }} />
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.25em",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          {t("results.avoid.kicker")}
        </span>
      </div>

      <p
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontStyle: "italic",
          fontSize: 15,
          color: "var(--text-secondary)",
          margin: "0 0 22px",
        }}
      >
        {t("results.avoid.body")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
          gap: 12,
        }}
      >
        {colors.map((c, i) => (
          <button
            key={c.hex + c.name}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            aria-label={t("results.avoid.swatchLabel", {
              name: c.name,
              reason: c.reason || c.note || t("results.avoid.defaultReason"),
            })}
            style={{
              position: "relative",
              height: 84,
              borderRadius: 12,
              border:
                active === i
                  ? "1.5px solid var(--color-error)"
                  : "1px solid rgba(255,255,255,0.08)",
              background: c.hex,
              cursor: "help",
              overflow: "hidden",
              padding: 0,
              transition: "transform 0.25s ease, border-color 0.25s ease",
              transform: active === i ? "translateY(-3px)" : "none",
            }}
          >
            {/* the slash */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-12%",
                right: "-12%",
                top: "50%",
                height: 2,
                background: "rgba(13,13,15,0.75)",
                transform: "rotate(-18deg)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.12)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                bottom: 6,
                fontFamily: "Inter, sans-serif",
                fontSize: 9,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(13,13,15,0.85)",
                background: "rgba(255,255,255,0.55)",
                borderRadius: 4,
                padding: "2px 4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {c.name}
            </span>
          </button>
        ))}
      </div>

      <p
        aria-live="polite"
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontStyle: "italic",
          fontSize: 15,
          color: activeReason ? "var(--text-secondary)" : "var(--text-muted)",
          textAlign: "center",
          minHeight: 24,
          margin: "18px 0 0",
          opacity: activeReason ? 1 : 0.6,
          transition: "opacity 0.25s ease",
        }}
      >
        {activeReason || t("results.avoid.hint")}
      </p>
    </section>
  );
}
