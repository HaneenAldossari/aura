import { useT } from "../../i18n";
import type { AnalysisResult, StoneShade } from "../../lib/types";

/**
 * Style, built from the Style frame.
 *
 * Jewellery is one block: metals and stones are the same decision made in two
 * materials, and splitting them made the page ask it twice. Both are rendered
 * rather than flat — a metal is a finish, not a colour, and a gem is a cut.
 * Everything else on the page stays a flat rectangle.
 *
 * Avoided metals sit after a rule and carry the same diagonal strike as an
 * avoided colour, so one mark means one thing everywhere.
 */

/** Metals with photography. Anything else falls back to a flat two-tone disc. */
const METAL_ASSET: Record<string, string> = {
  gold: "gold",
  "yellow gold": "gold",
  "rose gold": "rose-gold",
  silver: "silver",
};

const METAL_HEX: Record<string, { hex: string; accent: string }> = {
  "yellow gold": { hex: "#C9A567", accent: "#EBD9A8" },
  gold: { hex: "#C9A567", accent: "#EBD9A8" },
  "rose gold": { hex: "#C68A76", accent: "#E8BCA8" },
  "antique gold": { hex: "#A8884A", accent: "#CDB075" },
  "champagne gold": { hex: "#C8B68A", accent: "#E8DCBC" },
  bronze: { hex: "#8C5A2B", accent: "#BC8A50" },
  "brushed bronze": { hex: "#8A6540", accent: "#B8946A" },
  copper: { hex: "#A85A38", accent: "#D28A62" },
  silver: { hex: "#C6CBD2", accent: "#EEF1F5" },
  platinum: { hex: "#D2D7DE", accent: "#F2F5F8" },
  "white gold": { hex: "#DCDEE2", accent: "#F6F7F9" },
  pewter: { hex: "#8E8E94", accent: "#B6B6BC" },
};

function metalColours(name: string) {
  return METAL_HEX[name.trim().toLowerCase()] ?? { hex: "#8C8378", accent: "#B6AFA4" };
}

function Metal({ name, struck }: { name: string; struck?: boolean }) {
  const asset = METAL_ASSET[name.trim().toLowerCase()];
  const { hex, accent } = metalColours(name);
  return (
    <span className={`ed-metal${struck ? " ed-metal--avoid" : ""}`}>
      <span className={`ed-metal__wrap${struck ? " ed-metal__wrap--struck" : ""}`}>
        {asset ? (
          <img className="ed-metal__disc" src={`/makeup/metals/${asset}.webp`} alt="" loading="lazy" />
        ) : (
          <span
            className="ed-metal__disc"
            style={{ background: `radial-gradient(circle at 34% 30%, ${accent}, ${hex} 72%)` }}
          />
        )}
      </span>
      <span className="ed-metal__name">{name}</span>
    </span>
  );
}

function Gem({ stone }: { stone: StoneShade }) {
  return (
    <span className="ed-gem">
      {stone.asset ? (
        <img className="ed-gem__shot" src={`/makeup/gems/${stone.asset}.webp`} alt="" loading="lazy" />
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
  );
}

function Swatch({ shade, sub, struck }: { shade: StoneShade; sub?: string; struck?: boolean }) {
  return (
    <span className="ed-tile">
      <span
        className={`ed-tile__chip${struck ? " ed-tile__chip--struck" : ""}`}
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
  const metals = data.palette?.metals;
  const family = data.season.split(" ").slice(-1)[0].toLowerCase();

  return (
    <div>
      {/* ── Jewellery: metals and stones, one block ── */}
      <section className="ed-section">
        <div className="ed-head">
          <h2 className="ed-head__title">{t("results.styleSection.jewellery")}</h2>
          <span className="ed-head__meta">{t("results.styleSection.jewelleryMeta")}</span>
        </div>
        <hr className="ed-rule" />

        <div className="ed-jewellery">
          <div className="ed-metals">
            {metals?.best?.map((metal) => (
              <Metal key={metal} name={metal} />
            ))}
            {metals?.avoid && metals.avoid.length > 0 && (
              <>
                <span className="ed-metals__divider" aria-hidden />
                {metals.avoid.map((metal) => (
                  <Metal key={metal} name={metal} struck />
                ))}
              </>
            )}
          </div>

          {style?.gemstones && style.gemstones.length > 0 && (
            <div className="ed-gems">
              {style.gemstones.map((stone) => (
                <Gem key={stone.name} stone={stone} />
              ))}
            </div>
          )}
        </div>

        {style?.metalNote && <p className="ed-skip">{style.metalNote}</p>}
      </section>

      {/* ── Hair and Avoid, side by side ── */}
      <div className="ed-twoup">
        {style?.hair && style.hair.length > 0 && (
          <section>
            <div className="ed-head">
              <h2 className="ed-head__title">{t("results.styleSection.hair")}</h2>
              {data.hairColor?.bestOverall && (
                <span className="ed-head__meta">{data.hairColor.bestOverall.slice(0, 54)}</span>
              )}
            </div>
            <hr className="ed-rule" />
            <div className="ed-swatchgrid">
              {style.hair.map((shade, i) => (
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
              {style.hairAvoid?.map((shade) => (
                <Swatch key={shade.name} shade={shade} struck />
              ))}
            </div>
          </section>
        )}

        {data.palette?.avoid && data.palette.avoid.length > 0 && (
          <section>
            <div className="ed-head">
              <h2 className="ed-head__title">{t("results.styleSection.avoid")}</h2>
              <span className="ed-head__meta">{t("results.styleSection.avoidMeta")}</span>
            </div>
            <hr className="ed-rule" />
            <div className="ed-swatchgrid">
              {data.palette.avoid.slice(0, 6).map((colour) => (
                <Swatch
                  key={colour.hex}
                  shade={{ name: colour.name, hex: colour.hex, accent: colour.hex }}
                  struck
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
