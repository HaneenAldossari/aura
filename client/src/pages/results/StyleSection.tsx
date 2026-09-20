import { useT } from "../../i18n";
import { readableOn } from "../../lib/contrast";
import type { AnalysisResult, StoneShade } from "../../lib/types";

/**
 * Style, shown rather than described.
 *
 * This used to be rows of prose — "deep chestnut with warm caramel
 * highlights" — which is the one thing a colour page should never do. Metals,
 * stones and hair are all colour, so all three are rendered as colour. The
 * values are canonical (seasonStyle.ts, seasonPalettes.ts), so two people with
 * the same season see the same swatches.
 */

const METAL_HEX: Record<string, { hex: string; accent: string }> = {
  "yellow gold": { hex: "#C9A567", accent: "#EBD9A8" },
  gold: { hex: "#C9A567", accent: "#EBD9A8" },
  "rose gold": { hex: "#C68A76", accent: "#E8BCA8" },
  "antique gold": { hex: "#A8884A", accent: "#CDB075" },
  bronze: { hex: "#8C5A2B", accent: "#BC8A50" },
  "brushed bronze": { hex: "#8A6540", accent: "#B8946A" },
  copper: { hex: "#A85A38", accent: "#D28A62" },
  silver: { hex: "#C6CBD2", accent: "#EEF1F5" },
  platinum: { hex: "#D2D7DE", accent: "#F2F5F8" },
  "white gold": { hex: "#DCDEE2", accent: "#F6F7F9" },
  pewter: { hex: "#8E8E94", accent: "#B6B6BC" },
};

/** Unknown metal names still get a swatch rather than vanishing. */
function metalColours(name: string) {
  return METAL_HEX[name.trim().toLowerCase()] ?? { hex: "#8C8378", accent: "#B6AFA4" };
}

function TwoTone({ shade, round }: { shade: StoneShade; round?: boolean }) {
  return (
    <span className="ed-stone">
      <span
        className={`ed-stone__swatch${round ? " ed-stone__swatch--round" : ""}`}
        style={{ background: `linear-gradient(140deg, ${shade.accent} 0%, ${shade.hex} 58%)` }}
        aria-hidden
      />
      <span className="ed-stone__name">{shade.name}</span>
    </span>
  );
}

export default function StyleSection({ data }: { data: AnalysisResult }) {
  const t = useT();
  const style = data.styleShades;
  const metals = data.palette?.metals;

  return (
    <div>
      {metals?.best && metals.best.length > 0 && (
        <section className="ed-section">
          <h2 className="ed-section__label">{t("results.styleSection.metals")}</h2>
          <hr className="ed-rule" />
          <div className="ed-stones">
            {metals.best.map((metal) => (
              <TwoTone key={metal} round shade={{ name: metal, ...metalColours(metal) }} />
            ))}
          </div>

          {metals.avoid && metals.avoid.length > 0 && (
            <>
              <p className="ed-section__label" style={{ marginBlockStart: "var(--space-4)" }}>
                {t("results.styleSection.avoidMetals")}
              </p>
              <div className="ed-stones ed-stones--muted">
                {metals.avoid.map((metal) => (
                  <TwoTone key={metal} round shade={{ name: metal, ...metalColours(metal) }} />
                ))}
              </div>
            </>
          )}
          {style?.metalNote && <p className="ed-skip">{style.metalNote}</p>}
        </section>
      )}

      {style?.gemstones && style.gemstones.length > 0 && (
        <section className="ed-section">
          <h2 className="ed-section__label">{t("results.styleSection.gemstones")}</h2>
          <hr className="ed-rule" />
          <div className="ed-stones">
            {style.gemstones.map((stone) => (
              <TwoTone key={stone.name} shade={stone} />
            ))}
          </div>
        </section>
      )}

      {style?.hair && style.hair.length > 0 && (
        <section className="ed-section">
          <h2 className="ed-section__label">{t("results.styleSection.hair")}</h2>
          <hr className="ed-rule" />
          <div className="ed-hairs">
            {style.hair.map((shade) => (
              <span
                className="ed-hair"
                key={shade.name}
                style={{
                  background: `linear-gradient(180deg, ${shade.hex} 0%, ${shade.accent} 100%)`,
                  color: readableOn(shade.hex),
                }}
              >
                <span className="ed-hair__name">{shade.name}</span>
              </span>
            ))}
          </div>
          {data.hairColor?.bestOverall && <p className="ed-skip">{data.hairColor.bestOverall}</p>}
        </section>
      )}

      {data.palette?.avoid && data.palette.avoid.length > 0 && (
        <section className="ed-section">
          <h2 className="ed-section__label">{t("results.styleSection.avoid")}</h2>
          <hr className="ed-rule" />
          <div className="ed-index__shades">
            {data.palette.avoid.slice(0, 6).map((colour) => (
              <span className="ed-chip" key={colour.hex}>
                <span className="ed-chip__swatch" style={{ background: colour.hex }} aria-hidden />
                <span className="ed-chip__name">{colour.name}</span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
