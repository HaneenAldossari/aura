/**
 * The twelve colours as a PNG, with their names.
 *
 * Canvas is right here where it would be wrong in measure/: this is an image
 * being authored for download, not pixels being read, so the colour-management
 * and anti-fingerprinting problems that rule canvas out of decode.ts do not
 * apply — nothing is measured back off it.
 */
import type { ColorSwatch } from "../../lib/types";
import { readableOn } from "../../lib/contrast";

const COLS = 3;
const CELL_W = 360;
const CELL_H = 240;
const PAD = 64;
const HEADER = 190;

export function renderPaletteCanvas(
  seasonName: string,
  colours: ColorSwatch[],
  caption: string
): HTMLCanvasElement {
  const shown = colours.slice(0, 12);
  const rows = Math.max(1, Math.ceil(shown.length / COLS));
  const canvas = document.createElement("canvas");
  canvas.width = PAD * 2 + CELL_W * COLS;
  canvas.height = PAD + HEADER + CELL_H * rows + PAD;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#0C0A09";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#F3EDE4";
  ctx.font = '400 84px "Cormorant Garamond", Georgia, serif';
  ctx.textBaseline = "alphabetic";
  ctx.fillText(seasonName, PAD, PAD + 84);

  ctx.fillStyle = "#8C8378";
  ctx.font = '400 26px "IBM Plex Mono", monospace';
  ctx.fillText(caption, PAD, PAD + 140);

  shown.forEach((colour, i) => {
    const x = PAD + (i % COLS) * CELL_W;
    const y = PAD + HEADER + Math.floor(i / COLS) * CELL_H;

    ctx.fillStyle = colour.hex;
    ctx.fillRect(x, y, CELL_W - 8, CELL_H - 8);

    // The label rides on the swatch, so it picks whichever of ink/ground wins.
    ctx.fillStyle = readableOn(colour.hex);
    ctx.font = '600 28px Archivo, Helvetica, Arial, sans-serif';
    ctx.fillText(colour.name, x + 24, y + CELL_H - 58);
    ctx.font = '400 22px "IBM Plex Mono", monospace';
    ctx.fillText(colour.hex.toUpperCase(), x + 24, y + CELL_H - 28);
  });

  return canvas;
}

/** Trigger a download. Resolves once the blob has been handed to the browser. */
export function savePalettePng(
  seasonName: string,
  colours: ColorSwatch[],
  caption: string
): Promise<void> {
  return new Promise((resolve) => {
    const canvas = renderPaletteCanvas(seasonName, colours, caption);
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aura-${seasonName.toLowerCase().replace(/\s+/g, "-")}-palette.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoked on the next tick; revoking synchronously races the download in
      // Safari, which has not finished reading the blob when click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      resolve();
    }, "image/png");
  });
}
