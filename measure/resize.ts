/**
 * Downscaling.
 *
 * Box filter — average every source pixel falling inside a destination pixel.
 * Not nearest-neighbour, which aliases badly and would change measured colour by
 * whichever pixels happened to be sampled; and not a canvas `drawImage`, which
 * is the same colour-management and fingerprinting problem decode.ts avoids.
 *
 * Averaging happens in LINEAR light. Averaging gamma-encoded values biases dark:
 * mid-grey between black and white is linear 0.5, which encodes to ~188, not
 * 128. On a face that shows up as darker skin measurements from a downscaled
 * photo than from the original.
 */

import { linearToSrgb, srgbToLinear } from "./color";

export interface RasterImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Longest-edge scale factor needed to fit within `maxEdge`. 1 when it fits. */
export function scaleToFit(width: number, height: number, maxEdge: number): number {
  const longest = Math.max(width, height);
  return longest <= maxEdge ? 1 : maxEdge / longest;
}

/**
 * Box-filter downscale to a target width and height.
 *
 * Upscaling is refused: it invents detail and there is never a reason to do it
 * here. The caller gets the original back unchanged.
 */
export function resizeTo(image: RasterImage, width: number, height: number): RasterImage {
  const targetW = Math.max(1, Math.round(width));
  const targetH = Math.max(1, Math.round(height));
  if (targetW >= image.width && targetH >= image.height) return image;

  const out = new Uint8ClampedArray(targetW * targetH * 4);
  const xRatio = image.width / targetW;
  const yRatio = image.height / targetH;

  for (let y = 0; y < targetH; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.min(image.height, Math.max(y0 + 1, Math.ceil((y + 1) * yRatio)));

    for (let x = 0; x < targetW; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.min(image.width, Math.max(x0 + 1, Math.ceil((x + 1) * xRatio)));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * image.width + sx) * 4;
          // Linear light — see the note at the top of the file.
          r += srgbToLinear(image.data[i]);
          g += srgbToLinear(image.data[i + 1]);
          b += srgbToLinear(image.data[i + 2]);
          a += image.data[i + 3];
          n++;
        }
      }

      const o = (y * targetW + x) * 4;
      out[o] = linearToSrgb(r / n);
      out[o + 1] = linearToSrgb(g / n);
      out[o + 2] = linearToSrgb(b / n);
      out[o + 3] = a / n;
    }
  }

  return { data: out, width: targetW, height: targetH };
}

/** Downscale so the longest edge is at most `maxEdge`, preserving aspect ratio. */
export function resizeToFit(image: RasterImage, maxEdge: number): RasterImage {
  const scale = scaleToFit(image.width, image.height, maxEdge);
  if (scale === 1) return image;
  return resizeTo(image, image.width * scale, image.height * scale);
}
