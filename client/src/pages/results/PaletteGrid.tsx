import { useState } from "react";
import { useT } from "../../i18n";
import { readableOn } from "../../lib/contrast";
import type { ColorSwatch } from "../../lib/types";

/**
 * The twelve, from the canonical palette — never from the model.
 *
 * Each swatch picks its own label colour: the palette spans #F0D8A8 to #24160F
 * and one fixed label colour cannot clear 4.5:1 at both ends.
 */
export default function PaletteGrid({ colours }: { colours: ColorSwatch[] }) {
  const t = useT();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1400);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the hex is
      // on screen either way, so this is not worth an error state.
    }
  };

  return (
    <div className="ed-palette palette-band">
      {colours.slice(0, 12).map((colour) => {
        const ink = readableOn(colour.hex);
        return (
          <button
            type="button"
            key={`${colour.name}-${colour.hex}`}
            className="ed-swatch"
            style={{ background: colour.hex, color: ink }}
            onClick={() => copy(colour.hex)}
            aria-label={t("results.palette.swatch", { name: colour.name, hex: colour.hex })}
            title={colour.note || colour.name}
          >
            <span>
              <span className="ed-swatch__name">
                {copied === colour.hex ? t("results.palette.copied") : colour.name}
              </span>
              <span className="ed-swatch__hex ltr-run">
                {colour.hex.replace("#", "").toUpperCase()}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
