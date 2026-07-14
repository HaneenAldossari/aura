import { useState, useRef, useEffect } from "react";

interface HexTooltipProps {
  hex: string;
  name: string;
  children: React.ReactNode;
}

export function HexTooltip({ hex, name, children }: HexTooltipProps) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Mobile: dismiss on outside tap
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [show]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}
      onClick={(e) => { e.stopPropagation(); setShow((v) => !v); }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}

      {show && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-card)",
            border: "0.5px solid var(--border-color)",
            borderRadius: "6px",
            padding: "8px 12px",
            zIndex: 50,
            whiteSpace: "nowrap",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            pointerEvents: "auto",
          }}
        >
          {/* Color name */}
          <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {name}
          </span>
          {/* Hex code */}
          <span
            style={{
              fontFamily: "Cormorant Garamond, monospace",
              fontSize: "15px",
              color: "var(--accent-gold)",
              fontWeight: 500,
              lineHeight: 1.3,
            }}
          >
            {hex.toUpperCase()}
          </span>
          {/* Copy button */}
          <span
            onClick={handleCopy}
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              cursor: "pointer",
              marginTop: "2px",
              lineHeight: 1,
            }}
          >
            {copied ? "Copied" : "Copy"}
          </span>

          {/* Triangle pointer */}
          <div
            style={{
              position: "absolute",
              bottom: "-5px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid var(--border-color)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-4px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid var(--bg-card)",
            }}
          />
        </div>
      )}
    </div>
  );
}
