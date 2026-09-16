/**
 * Producing the canonical image that gets uploaded.
 *
 * The rule (CLAUDE.md): the image posted to /api/analyze must be the one this
 * module produced — ICC-converted to sRGB, EXIF-uprighted, downscaled — never
 * the raw upload. Otherwise the model reads a Display P3 file as sRGB and
 * disagrees with the measured features for a reason neither side can see. On a
 * real iPhone photo that is a 4-degree hue error, enough to flip the undertone
 * label.
 *
 * Measurement still runs on the *decoded, native-gamut* pixels; only the
 * uploaded copy is converted. Converting before measuring would clip
 * out-of-gamut colour and throw away precision for no benefit.
 */

import { convertToSrgb, type Gamut, type RGB } from "./color";
import type { DecodedImage } from "./decode";
import { resizeToFit, type RasterImage } from "./resize";

/** Longest edge of the uploaded image. Matches the server's existing sharp cap. */
export const UPLOAD_MAX_EDGE = 1024;

/** JPEG quality for the upload. Matches the server's existing sharp setting. */
export const UPLOAD_QUALITY = 82;

export interface CanonicalImage {
  /** JPEG bytes, sRGB, upright, downscaled. */
  bytes: Uint8Array;
  width: number;
  height: number;
  /** The gamut the source was in, so the caller can report the conversion. */
  sourceGamut: Gamut;
  /** True when pixels were actually re-encoded from another gamut. */
  converted: boolean;
}

/**
 * Rewrite a whole buffer into sRGB.
 *
 * A no-op for anything that is already sRGB — including "assumed-srgb", where
 * we do not know the real gamut and guessing a conversion would be worse than
 * leaving the values alone and carrying the caveat.
 */
export function toSrgbPixels(image: RasterImage, from: Gamut): RasterImage {
  if (from !== "display-p3") return image;

  const out = new Uint8ClampedArray(image.data.length);
  const pixel: RGB = { r: 0, g: 0, b: 0 };
  for (let i = 0; i < image.data.length; i += 4) {
    pixel.r = image.data[i];
    pixel.g = image.data[i + 1];
    pixel.b = image.data[i + 2];
    const srgb = convertToSrgb(pixel, from);
    out[i] = srgb.r;
    out[i + 1] = srgb.g;
    out[i + 2] = srgb.b;
    out[i + 3] = image.data[i + 3];
  }
  return { data: out, width: image.width, height: image.height };
}

/**
 * Turn a decoded image into the JPEG that gets uploaded.
 *
 * Order matters: convert gamut first, then downscale. Downscaling averages in
 * linear light, and averaging P3 values as though they were sRGB would bake the
 * gamut error into the result before conversion could fix it.
 */
export async function toCanonicalJpeg(
  image: DecodedImage,
  options: { maxEdge?: number; quality?: number } = {}
): Promise<CanonicalImage> {
  const maxEdge = options.maxEdge ?? UPLOAD_MAX_EDGE;
  const quality = options.quality ?? UPLOAD_QUALITY;

  const source: RasterImage = {
    data: image.data,
    width: image.width,
    height: image.height,
  };

  const converted = image.gamut === "display-p3";
  const srgb = toSrgbPixels(source, image.gamut);
  const scaled = resizeToFit(srgb, maxEdge);

  const { default: encode } = await import("@jsquash/jpeg/encode");
  const buffer = await encode(
    {
      data: scaled.data as Uint8ClampedArray<ArrayBuffer>,
      width: scaled.width,
      height: scaled.height,
      colorSpace: "srgb",
    } as ImageData,
    { quality }
  );

  return {
    bytes: new Uint8Array(buffer),
    width: scaled.width,
    height: scaled.height,
    sourceGamut: image.gamut,
    converted,
  };
}
