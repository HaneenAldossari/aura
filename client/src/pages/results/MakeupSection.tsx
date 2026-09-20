import { useT, type Key } from "../../i18n";
import { readableOn } from "../../lib/contrast";
import type { AnalysisResult, LookSlot, MakeupShade } from "../../lib/types";

/**
 * Makeup, in the flat bar language of the palette.
 *
 * Circular swatches and dabs are gone: two colour vocabularies on one screen
 * read as two products, and the design's vocabulary is the bar. The single
 * figurative element is the nail silhouette, used where a bar genuinely fails
 * to say what the colour is for.
 *
 * Every hex here came from the canonical per-season list server-side. The model
 * supplied look names, vibe lines and shade *names* only.
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

/** A look's shade: a full-width bar, because the look is the point. */
function ShadeBar({ shade, slotKey }: { shade: MakeupShade; slotKey: Key }) {
  const t = useT();
  return (
    <div className="ed-bar">
      <span className="ed-bar__slot">{t(slotKey)}</span>
      <span
        className="ed-bar__swatch"
        style={{ background: shade.hex, color: readableOn(shade.hex) }}
      >
        <span className="ed-bar__name">{shade.name}</span>
        <span className="ed-bar__finish">{shade.finish}</span>
      </span>
    </div>
  );
}

/** An index entry: a chip, so a whole category fits on one line. */
function ShadeChip({ shade }: { shade: MakeupShade }) {
  return (
    <span className="ed-chip">
      <span className="ed-chip__swatch" style={{ background: shade.hex }} aria-hidden />
      <span className="ed-chip__name">{shade.name}</span>
      <span className="ed-chip__finish">{shade.finish}</span>
    </span>
  );
}

export default function MakeupSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const makeup = data.makeupShades;
  if (!makeup) return null;

  const looks = data.looks ?? [];
  const depth = data.colorDNA?.depth;

  // Which rung of the ladder the measured depth falls on. The caption names
  // that swatch, because "your depth is 22 of 100" is not something anyone can
  // take to a counter — "look for shades named like Light Ivory" is.
  const step =
    typeof depth === "number"
      ? Math.min(
          makeup.foundation.length - 1,
          Math.max(0, Math.floor((depth / 100) * makeup.foundation.length))
        )
      : null;

  const depthWord = (data.measured?.axes?.value?.label ?? data.depth ?? "")
    .split("/")[0]
    .trim()
    .toLowerCase();
  const undertoneWord = (data.measured?.axes?.hue?.label ?? data.undertone ?? "")
    .split("/")[0]
    .trim()
    .toLowerCase();

  // Two names either side of the marked rung: a counter has more than one
  // shade at any depth, and naming only one reads as a prescription.
  const examples =
    step === null
      ? ""
      : [makeup.foundation[step], makeup.foundation[step + 1] ?? makeup.foundation[step - 1]]
          .filter(Boolean)
          .map((f) => f.name.toLowerCase())
          .join(" or ");

  return (
    <section className="ed-section" aria-labelledby="makeup-label">
      <h2 className="ed-section__label" id="makeup-label">
        {t("results.makeupSection.title")}
      </h2>
      <hr className="ed-rule" />

      {/* ── Base: the depth ladder, with the measured depth marked ── */}
      <div style={{ marginBlockEnd: "var(--space-6)" }}>
        <p className="ed-section__label">{t("results.makeupSection.baseLabel")}</p>
        <div
          className="ed-ladder"
          role="img"
          aria-label={t("results.makeupSection.ladderLabel", {
            depth: Math.round(depth ?? 50),
          })}
        >
          {makeup.foundation.map((shade, i) => (
            <span className="ed-rung" key={shade.name}>
              <span
                className={`ed-ladder__step${step === i ? " ed-ladder__step--on" : ""}`}
                style={{ background: shade.hex }}
              >
                {step === i && (
                  <span className="ed-ladder__mark" style={{ insetInlineStart: "50%" }} aria-hidden />
                )}
              </span>
              <span className={`ed-rung__name${step === i ? " ed-rung__name--on" : ""}`}>
                {shade.name}
              </span>
            </span>
          ))}
        </div>

        {step !== null && depthWord && (
          <p className="ed-depthline">
            {t("results.makeupSection.yourDepth", {
              depth: depthWord,
              undertone: undertoneWord,
              examples,
            })}
          </p>
        )}
        <p className="ed-skip" style={{ marginBlockStart: "var(--space-2)" }}>
          {makeup.undertoneGuide}
        </p>
      </div>

      {/* ── Looks ── */}
      {looks.length > 0 && (
        <div style={{ marginBlockEnd: "var(--space-6)" }}>
          <p className="ed-section__label">{t("results.makeupSection.looksLabel")}</p>
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
                <div className="ed-bars">
                  {look.shades.map((shade) => (
                    <ShadeBar key={shade.slot} shade={shade} slotKey={SLOT_LABEL[shade.slot]} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ── Shade index ── */}
      <div>
        <p className="ed-section__label">{t("results.makeupSection.indexLabel")}</p>
        <div className="ed-index">
          {INDEX_ROWS.map((row) => {
            const shades = makeup[row.key as keyof typeof makeup] as MakeupShade[];
            if (!Array.isArray(shades) || shades.length === 0) return null;
            return (
              <div className="ed-index__row" key={row.key}>
                <span className="ed-index__cat">{t(row.labelKey)}</span>
                <div className="ed-index__shades">
                  {shades.map((shade) => (
                    <ShadeChip key={shade.name} shade={shade} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Nails: the one figurative element in the section. */}
          {makeup.nails.length > 0 && (
            <div className="ed-index__row">
              <span className="ed-index__cat">{t("results.makeupSection.catNails")}</span>
              <div className="ed-index__nails">
                {makeup.nails.map((shade) => (
                  <span className="ed-nailitem" key={shade.name}>
                    <span className="ed-nail" style={{ background: shade.hex }} aria-hidden />
                    <span className="ed-nailitem__name">{shade.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="ed-skip">{makeup.skip}</p>
      </div>
    </section>
  );
}
