import { useT, type Key } from "../../i18n";
import { foundationStep } from "../../lib/foundation";
import type { AnalysisResult, LookSlot, MakeupShade } from "../../lib/types";

/**
 * Beauty: every section opens with guidance, then colour.
 *
 * A row of swatches cannot say "go one depth deeper", "never black", or "if it
 * is visible from across a room it is too bright" — and those are the sentences
 * that make the swatches usable. Someone who does not already know what
 * "muted" means gets nothing from a muted swatch on its own.
 *
 * The guidance is canonical, not model-written, so two people with the same
 * season read the same advice.
 *
 * One rule decides the colour elements: a colour is a flat rectangle, a product
 * is a render. Only nails are rendered here, because a polish has a finish you
 * can see and there are photographs of them.
 */

const SLOT_LABEL: Record<LookSlot, Key> = {
  eye: "results.makeupSection.slotEye",
  liner: "results.makeupSection.slotLiner",
  cheek: "results.makeupSection.slotCheek",
  lip: "results.makeupSection.slotLip",
  bronzer: "results.makeupSection.slotBronzer",
  highlight: "results.makeupSection.slotHighlight",
};

/** Each shade category, in the order the tab reads them. */
const CATEGORIES = [
  { key: "blush", labelKey: "results.makeupSection.catBlush", guide: "blush" },
  { key: "lip", labelKey: "results.makeupSection.catLip", guide: "lip" },
  { key: "eye", labelKey: "results.makeupSection.catEye", guide: "eye" },
  { key: "liner", labelKey: "results.makeupSection.catLiner", guide: "liner" },
] as const satisfies ReadonlyArray<{ key: string; labelKey: Key; guide: string }>;

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

/** Heading, then the sentence, then the colour. Always that order. */
function SectionHead({
  title,
  meta,
  guidance,
}: {
  title: string;
  meta?: string;
  guidance: string;
}) {
  return (
    <>
      <div className="ed-head">
        <h2 className="ed-head__title">{title}</h2>
        {meta && <span className="ed-head__meta">{meta}</span>}
      </div>
      <hr className="ed-rule" />
      <p className="ed-guide">{guidance}</p>
    </>
  );
}

export default function MakeupSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const makeup = data.makeupShades;
  if (!makeup) return null;

  const looks = data.looks ?? [];
  const depth = data.colorDNA?.depth;
  const guidance = makeup.guidance;

  const step = foundationStep(depth, makeup.foundation.length);
  const matched = step === null ? null : makeup.foundation[step];

  return (
    <div>
      {/* ── Base ── */}
      <section className="ed-section">
        <SectionHead
          title={t("results.makeupSection.baseLabel")}
          meta={
            matched ? t("results.makeupSection.yourDepthMeta", { shade: matched.name }) : undefined
          }
          guidance={guidance.base}
        />
        <div
          className="ed-ladder"
          role="img"
          aria-label={t("results.makeupSection.ladderLabel", { depth: Math.round(depth ?? 50) })}
        >
          {makeup.foundation.map((shade, i) => (
            <Tile key={shade.name} shade={{ ...shade, finish: undefined }} marked={step === i} />
          ))}
        </div>
      </section>

      {/* ── One section per category, each led by its guidance ── */}
      {CATEGORIES.map((cat) => {
        const shades = makeup[cat.key as keyof typeof makeup] as MakeupShade[];
        if (!Array.isArray(shades) || shades.length === 0) return null;
        return (
          <section className="ed-section" key={cat.key}>
            <SectionHead
              title={t(cat.labelKey)}
              guidance={guidance[cat.guide as keyof typeof guidance]}
            />
            <div className="ed-shaderow">
              {shades.map((shade) => (
                <Tile key={shade.name} shade={shade} />
              ))}
            </div>
          </section>
        );
      })}

      {/* ── Nails: the one rendered category ── */}
      {makeup.nails.length > 0 && (
        <section className="ed-section">
          <SectionHead
            title={t("results.makeupSection.catNails")}
            guidance={guidance.nails}
          />
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
                {/* Brand first: a polish is asked for by its maker's name. */}
                <span className="ed-tile__name">
                  {shade.brand ? `${shade.brand} · ${shade.name}` : shade.name}
                </span>
                <span className="ed-tile__sub">{shade.finish}</span>
              </span>
            ))}
          </div>
        </section>
      )}
      {/* ── Looks, last ──
          The categories above are the vocabulary; a look is a sentence made
          from it. Read in that order, every shade in a look has already been
          introduced by the time it appears. */}
      {looks.length > 0 && (
        <section className="ed-section">
          <div className="ed-head">
            <h2 className="ed-head__title">{t("results.makeupSection.looksLabel")}</h2>
            <span className="ed-head__meta">
              {t("results.makeupSection.looksMeta", { count: looks.length, season: data.season })}
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

    </div>
  );
}
