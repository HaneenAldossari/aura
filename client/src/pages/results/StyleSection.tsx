import { useT, type Key } from "../../i18n";
import type { AnalysisResult, StoneShade } from "../../lib/types";

/**
 * Style: guidance, then colour, in every section.
 *
 * The metal discs are gone. A grid of photographed discs looked like a product
 * range and answered the wrong question — nobody is choosing between seven
 * metals, they are asking whether their gold ring is a mistake. Three rows with
 * a verdict answer that in one glance.
 *
 * Avoids live inside the guidance rather than in a block of their own: "avoid
 * ash tones" belongs in the sentence about hair, where it is read by someone
 * already thinking about hair, not in a separate list further down the page.
 */

const VERDICT_KEY: Record<string, Key> = {
  best: "results.styleSection.verdictBest",
  works: "results.styleSection.verdictWorks",
  skip: "results.styleSection.verdictSkip",
};

/** Metals we hold hexes for, so a row can show the metal as well as name it. */
const METAL_HEX: Record<string, { hex: string; accent: string }> = {
  "yellow gold": { hex: "#C9A567", accent: "#EBD9A8" },
  "rose gold": { hex: "#C68A76", accent: "#E8BCA8" },
  silver: { hex: "#C6CBD2", accent: "#EEF1F5" },
};

function metalColours(name: string) {
  return METAL_HEX[name.trim().toLowerCase()] ?? { hex: "#8C8378", accent: "#B6AFA4" };
}

function SectionHead({ title, meta, guidance }: { title: string; meta?: string; guidance: string }) {
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

function Swatch({ shade, sub }: { shade: StoneShade; sub?: string }) {
  return (
    <span className="ed-tile">
      <span
        className="ed-tile__chip"
        style={{ background: `linear-gradient(180deg, ${shade.hex} 0%, ${shade.accent} 100%)` }}
      />
      <span className="ed-tile__name">{shade.name}</span>
      {sub && <span className="ed-tile__sub">{sub}</span>}
    </span>
  );
}

export default function StyleSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const style = data.styleShades;
  if (!style) return null;

  const family = data.season.split(" ").slice(-1)[0].toLowerCase();

  return (
    <div>
      {/* ── Jewellery: three verdicts, then the stones ── */}
      <section className="ed-section">
        <SectionHead
          title={t("results.styleSection.jewellery")}
          meta={t("results.styleSection.jewelleryMeta")}
          guidance={style.guidance.jewellery}
        />

        <ul className="ed-metals">
          {style.metals.map((metal) => {
            const { hex, accent } = metalColours(metal.name);
            return (
              <li className={`ed-metalrow ed-metalrow--${metal.verdict}`} key={metal.name}>
                <span
                  className="ed-metalrow__swatch"
                  style={{ background: `linear-gradient(140deg, ${accent}, ${hex} 65%)` }}
                  aria-hidden
                />
                <span className="ed-metalrow__name">{metal.name}</span>
                <span className="ed-metalrow__verdict">{t(VERDICT_KEY[metal.verdict])}</span>
                <span className="ed-metalrow__reason">{metal.reason}</span>
              </li>
            );
          })}
        </ul>

        {style.extraMetals && (
          <p className="ed-metals__also">
            {t("results.styleSection.alsoMetals", { metals: style.extraMetals })}
          </p>
        )}

        <div className="ed-gems">
          {style.gemstones.slice(0, 4).map((stone) => (
            <span className="ed-gem" key={stone.name}>
              {stone.asset ? (
                <img
                  className="ed-gem__shot"
                  src={`/makeup/gems/${stone.asset}.webp`}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <span
                  className="ed-gem__shot"
                  style={{
                    background: `linear-gradient(140deg, ${stone.accent} 0%, ${stone.hex} 58%)`,
                    clipPath: "polygon(50% 0, 100% 26%, 100% 74%, 50% 100%, 0 74%, 0 26%)",
                  }}
                />
              )}
              <span className="ed-gem__name">{stone.name}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Hair ── */}
      {style.hair.length > 0 && (
        <section className="ed-section">
          <SectionHead title={t("results.styleSection.hair")} guidance={style.guidance.hair} />
          <div className="ed-shaderow">
            {style.hair.slice(0, 4).map((shade, i) => (
              <Swatch
                key={shade.name}
                shade={shade}
                sub={
                  i === 0
                    ? t("results.styleSection.exactMatch")
                    : t("results.styleSection.familyMatch", { family })
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Pairings ── */}
      {style.pairings.length > 0 && (
        <section className="ed-section">
          <SectionHead
            title={t("results.styleSection.pairings")}
            meta={t("results.styleSection.pairingsMeta")}
            guidance={style.guidance.pairings}
          />
          <div className="ed-pairings">
            {style.pairings.map((pairing) => (
              <article className="ed-pairing" key={pairing.when}>
                <span className="ed-pairing__stack">
                  {pairing.colours.map((colour) => (
                    <span className="ed-pairing__band" key={colour.hex}>
                      <span
                        className="ed-pairing__swatch"
                        style={{ background: colour.hex }}
                        aria-hidden
                      />
                      <span className="ed-pairing__name">{colour.name}</span>
                    </span>
                  ))}
                </span>
                <p className="ed-pairing__when">{pairing.when}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
