import type { ReactNode } from "react";

/**
 * EditorialSection — shared header rhythm for the Beauty and Style tabs:
 * a big Cormorant serif title over a gold hairline, with an italic one-line
 * stage direction, then the section content.
 */
export default function EditorialSection({
  title,
  direction,
  children,
}: {
  title: string;
  /** Italic one-line stage direction under the hairline */
  direction?: string;
  children?: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h3
        style={{
          fontFamily: "Cormorant Garamond, serif",
          fontSize: 32,
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.1,
          margin: 0,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, var(--accent-gold), transparent 72%)",
          opacity: 0.45,
          margin: "10px 0 6px",
        }}
      />
      {direction && (
        <p
          style={{
            fontFamily: "Cormorant Garamond, serif",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--text-secondary)",
            margin: "0 0 20px",
          }}
        >
          {direction}
        </p>
      )}
      {children}
    </section>
  );
}
