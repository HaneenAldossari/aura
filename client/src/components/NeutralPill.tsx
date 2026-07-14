import { useState } from "react";

interface NeutralPillProps {
  name: string;
  hex: string;
}

export function NeutralPill({ name, hex }: NeutralPillProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((p) => !p)}
    >
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 80,
            borderRadius: 10,
            background: hex,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: isLight(hex) ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)",
              textShadow: isLight(hex)
                ? "none"
                : "0 1px 3px rgba(0,0,0,0.5)",
            }}
          >
            {hex.toUpperCase()}
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg-subtle, rgba(255,255,255,0.04))",
          border: "0.5px solid var(--border-color)",
          borderRadius: 20,
          padding: "6px 14px",
          cursor: "pointer",
          transition: "background 0.2s ease",
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: hex,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.2,
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            letterSpacing: "0.05em",
            lineHeight: 1,
          }}
        >
          {hex.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 180;
}
