import { useT, type Key } from "../../i18n";
import type { AnalysisResult, LookSlot, MakeupShade } from "../../lib/types";

/**
 * Beauty, built from the Beauty frame.
 *
 * One rule decides every element: a colour is a flat rectangle, a product is a
 * render. A flat rectangle is an honest statement of a colour; a rendered dab
 * is a guess at a texture nobody supplied. Nails are the exception because a
 * polish has a finish you can actually see, and there are photographs of them.
 */

const SLOT_LABEL: Record<LookSlot, Key> = {
  eye: "results.makeupSection.slotEye",
  liner: "results.makeupSection.slotLiner",
  cheek: "results.makeupSection.slotCheek",
  lip: "results.makeupSection.slotLip",
  bronzer: "results.makeupSection.slotBronzer",
  highlight: "results.makeupSection.slotHighlight",
};

const INDEX_ROWS = [
  { key: "blush", labelKey: "results.makeupSection.catBlush" },
  { key: "lip", labelKey: "results.makeupSection.catLip" },
  { key: "eye", labelKey: "results.makeupSection.catEye" },
  { key: "liner", labelKey: "results.makeupSection.catLiner" },
] as const satisfies ReadonlyArray<{ key: string; labelKey: Key }>;

/** A colour, stated flat. */
function Tile({
  shade,
  marked,
  sub,
}: {
  shade: { name: string; hex: string; finish?: string };
  marked?: boolean;
  sub?: string;
}) {
  return (
    <span className="ed-tile">
      <span
        className={`ed-tile__chip${marked ? " ed-tile__chip--on" : ""}`}
        style={{ background: shade.hex }}
      >
        {marked && (
          <span className="ed-ladder__caret" aria-hidden>
            ▼
          </span>
        )}
      </span>
      <span className="ed-tile__name">{shade.name}</span>
      {(sub ?? shade.finish) && <span className="ed-tile__sub">{sub ?? shade.finish}</span>}
    </span>
  );
}

export default function MakeupSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const makeup = data.makeupShades;
  if (!makeup) return null;

  const looks = data.looks ?? [];
  const depth = data.colorDNA?.depth;

  const step =
    typeof depth === "number"
      ? Math.min(
          makeup.foundation.length - 1,
          Math.max(0, Math.floor((depth / 100) * makeup.foundation.length))
        )
      : null;

  const matched = step === null ? null : makeup.foundation[step];

  return (
    <div>
      {/* ── Base ── */}
      <section className="ed-section">
        <div className="ed-head">
          <h2 className="ed-head__title">{t("results.makeupSection.baseLabel")}</h2>
          {matched && (
            <span className="ed-head__meta">
              {t("results.makeupSection.yourDepthMeta", { shade: matched.name })}
            </span>
          )}
        </div>
        <hr className="ed-rule" />

        <div className="ed-base">
          <div
            className="ed-ladder"
            role="img"
            aria-label={t("results.makeupSection.ladderLabel", {
              depth: Math.round(depth ?? 50),
            })}
          >
            {makeup.foundation.map((shade, i) => (
              <Tile key={shade.name} shade={{ ...shade, finish: undefined }} marked={step === i} />
            ))}
          </div>

          <div>
            {matched && (
              <p className="ed-base__title">
                {t("results.makeupSection.baseHeading", {
                  shade: matched.name.toLowerCase(),
                })}
              </p>
            )}
            <p className="ed-base__body">{makeup.undertoneGuide}</p>
          </div>
        </div>
      </section>

      {/* ── Looks ── */}
      {looks.length > 0 && (
        <section className="ed-section">
          <div className="ed-head">
            <h2 className="ed-head__title">{t("results.makeupSection.looksLabel")}</h2>
            <span className="ed-head__meta">
              {t("results.makeupSection.looksMeta", {
                count: looks.length,
                season: data.season,
              })}
            </span>
          </div>
          <hr className="ed-rule" />

          <div className="ed-looks">
            {looks.map((look) => (
              <article className="ed-look" key={look.name}>
                <div className="ed-look__head">
                  <h3 className="ed-look__name">{look.name}</h3>
                  <span className="ed-look__tag">
                    {t(
                      look.timeOfDay === "evening"
                        ? "results.makeupSection.evening"
                        : "results.makeupSection.day"
                    )}
                  </span>
                </div>
                {look.vibe && <p className="ed-look__vibe">{look.vibe}</p>}
                <div className="ed-look__shades">
                  {look.shades.map((shade) => (
                    <span key={shade.slot}>
                      <span className="ed-slot" style={{ display: "block" }}>
                        {t(SLOT_LABEL[shade.slot])}
                      </span>
                      <Tile shade={shade} />
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Shade index ── */}
      <section className="ed-section">
        <div className="ed-head">
          <h2 className="ed-head__title">{t("results.makeupSection.indexLabel")}</h2>
          <span className="ed-head__meta">{t("results.makeupSection.indexMeta")}</span>
        </div>
        <hr className="ed-rule" />

        <div className="ed-index">
          {INDEX_ROWS.map((row) => {
            const shades = makeup[row.key as keyof typeof makeup] as MakeupShade[];
            if (!Array.isArray(shades) || shades.length === 0) return null;
            return (
              <div key={row.key}>
                <p className="ed-index__cat">{t(row.labelKey)}</p>
                <div className="ed-index__grid">
                  {shades.map((shade) => (
                    <Tile key={shade.name} shade={shade} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {makeup.nails.length > 0 && (
          <div style={{ marginBlockStart: "var(--space-5)" }}>
            <p className="ed-index__cat">{t("results.makeupSection.catNails")}</p>
            <div className="ed-index__nails">
              {makeup.nails.map((shade) => (
                <span className="ed-tile" key={shade.name}>
                  {shade.asset ? (
                    <img
                      className="ed-nailshot"
                      src={`/makeup/nails/${shade.asset}.webp`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="ed-tile__chip" style={{ background: shade.hex }} />
                  )}
                  <span className="ed-tile__name">{shade.name}</span>
                  <span className="ed-tile__sub">{shade.finish}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="ed-skip">{makeup.skip}</p>
      </section>
    </div>
  );
}
