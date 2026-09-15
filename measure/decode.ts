/**
 * Image decoding to raw RGBA pixels, with EXIF orientation and ICC handling.
 *
 * ── Why not canvas ───────────────────────────────────────────────────────────
 * `canvas.getImageData()` cannot give pixel-identical results across browsers,
 * for two independent reasons, neither defeatable from JavaScript:
 *
 *   1. Colour management. The browser converts canvas contents to the display's
 *      colour profile before sampling, so a wide-gamut or HDR monitor changes
 *      the numbers you read back.
 *   2. Anti-fingerprinting. Firefox `privacy.resistFingerprinting`, Brave and
 *      Safari deliberately perturb getImageData output; it does not even
 *      round-trip with putImageData.
 *
 * Measurement needs the same photo to produce the same Lab values everywhere,
 * so decoding goes through WASM builds of libjpeg-turbo, libpng and libwebp
 * (@jsquash/*), which are deterministic on every platform.
 *
 * The codecs are imported dynamically so that this module can be loaded — and
 * its pure helpers unit-tested — without pulling in any WASM.
 */

import type { Gamut } from "./color";

// ─────────────────────────────────────────────────────────────────────────────
// Formats
// ─────────────────────────────────────────────────────────────────────────────

export type SupportedFormat = "jpeg" | "png" | "webp";
export type KnownFormat = SupportedFormat | "heic" | "avif" | "gif" | "bmp" | "tiff";
export type SniffedFormat = KnownFormat | "unknown";

const SUPPORTED: SupportedFormat[] = ["jpeg", "png", "webp"];

export function isSupported(format: SniffedFormat): format is SupportedFormat {
  return (SUPPORTED as string[]).includes(format);
}

/**
 * What to tell the user about a format we cannot read.
 *
 * HEIC is the one that matters: it is the iPhone default. iOS Safari usually
 * transcodes to JPEG when a photo is chosen through `accept="image/*"`, but not
 * always — picking via the Files app, or receiving a .heic by AirDrop and
 * uploading from a desktop browser, both deliver the original.
 */
const FORMAT_MESSAGES: Record<Exclude<KnownFormat, SupportedFormat> | "unknown", string> = {
  heic: "This looks like an iPhone HEIC photo, which browsers can't read directly. In your iPhone Settings, open Camera › Formats and choose “Most Compatible”, or export the photo as JPEG and try again.",
  avif: "AVIF images aren't supported yet. Please upload a JPEG, PNG or WebP.",
  gif: "GIFs aren't supported. Please upload a JPEG, PNG or WebP photo.",
  bmp: "BMP images aren't supported. Please upload a JPEG, PNG or WebP photo.",
  tiff: "TIFF images aren't supported. Please upload a JPEG, PNG or WebP photo.",
  unknown: "We couldn't read that file as an image. Please upload a JPEG, PNG or WebP photo.",
};

export function unsupportedFormatMessage(format: SniffedFormat): string {
  if (isSupported(format)) return "";
  return FORMAT_MESSAGES[format as keyof typeof FORMAT_MESSAGES] ?? FORMAT_MESSAGES.unknown;
}

/**
 * Identify a format from its magic bytes. Never trusts the file extension or
 * the browser-reported MIME type, both of which are frequently wrong for HEIC.
 */
export function sniffFormat(bytes: Uint8Array<ArrayBufferLike>): SniffedFormat {
  const b = bytes;
  if (b.length < 12) return "unknown";

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) {
    if (b[2] === 0x2a || b[3] === 0x2a) return "tiff";
  }

  const ascii = (start: number, len: number) =>
    String.fromCharCode(...b.subarray(start, start + len));

  // RIFF....WEBP
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";

  // ISO base media: ....ftyp<brand>
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (/^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|hevm|hevs)$/.test(brand)) return "heic";
    if (/^(avif|avis)$/.test(brand)) return "avif";
  }

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export type DecodeErrorCode = "unsupported_format" | "corrupt" | "too_large";

/**
 * Carries a message meant for the user. quality.ts turns this into an issue
 * string rather than letting it propagate as an exception.
 */
export class DecodeError extends Error {
  readonly code: DecodeErrorCode;
  readonly userMessage: string;
  readonly format: SniffedFormat;

  constructor(code: DecodeErrorCode, userMessage: string, format: SniffedFormat = "unknown") {
    super(`${code}: ${userMessage}`);
    this.name = "DecodeError";
    this.code = code;
    this.userMessage = userMessage;
    this.format = format;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXIF orientation
// ─────────────────────────────────────────────────────────────────────────────

/** EXIF orientation values 1-8. 1 is upright. */
export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Whether an orientation swaps the width and height. */
export function orientationSwapsAxes(orientation: Orientation): boolean {
  return orientation >= 5;
}

/**
 * Rewrite RGBA pixels into upright order.
 *
 * Done on the decoded buffer rather than with a canvas transform, so the output
 * stays byte-identical across browsers.
 */
export function applyOrientation(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  orientation: Orientation
): { data: Uint8ClampedArray; width: number; height: number } {
  if (orientation === 1) return { data, width, height };

  const swap = orientationSwapsAxes(orientation);
  const outW = swap ? height : width;
  const outH = swap ? width : height;
  const out = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let nx: number;
      let ny: number;
      switch (orientation) {
        case 2: nx = width - 1 - x; ny = y; break;              // mirror horizontal
        case 3: nx = width - 1 - x; ny = height - 1 - y; break; // rotate 180
        case 4: nx = x; ny = height - 1 - y; break;             // mirror vertical
        case 5: nx = y; ny = x; break;                          // transpose
        case 6: nx = height - 1 - y; ny = x; break;             // rotate 90 CW
        case 7: nx = height - 1 - y; ny = width - 1 - x; break; // transverse
        case 8: nx = y; ny = width - 1 - x; break;              // rotate 90 CCW
        default: nx = x; ny = y;
      }
      const src = (y * width + x) * 4;
      const dst = (ny * outW + nx) * 4;
      out[dst] = data[src];
      out[dst + 1] = data[src + 1];
      out[dst + 2] = data[src + 2];
      out[dst + 3] = data[src + 3];
    }
  }
  return { data: out, width: outW, height: outH };
}

// ─────────────────────────────────────────────────────────────────────────────
// ICC profiles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map an ICC profile description to a gamut we can convert from.
 *
 * Only a small set of well-known matrix/TRC profiles is recognised. Anything
 * else is reported as "assumed-srgb" and measured as sRGB, so the assumption
 * travels with the features rather than being silently forgotten.
 */
export function gamutFromProfileDescription(description: string | undefined): Gamut {
  if (!description) return "assumed-srgb";
  const d = description.toLowerCase();
  if (/display\s*p3|dci[-\s]?p3|\bp3\b/.test(d)) return "display-p3";
  if (/srgb|iec61966/.test(d)) return "srgb";
  return "assumed-srgb";
}

// ─────────────────────────────────────────────────────────────────────────────
// Decode
// ─────────────────────────────────────────────────────────────────────────────

export interface DecodedImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  format: SupportedFormat;
  /** Which primaries the values are in. Feeds color.rgbToLab(). */
  gamut: Gamut;
  /** The EXIF orientation that was applied, if any. */
  orientation: Orientation;
  /** ICC profile description as read, for diagnostics. */
  profileDescription?: string;
}

/**
 * Decode an image to upright RGBA pixels.
 *
 * Throws DecodeError for anything the user needs to act on. Callers in the
 * quality step catch it and surface `userMessage`.
 */
export async function decodeImage(bytes: Uint8Array<ArrayBufferLike>): Promise<DecodedImage> {
  const format = sniffFormat(bytes);
  if (!isSupported(format)) {
    throw new DecodeError("unsupported_format", unsupportedFormatMessage(format), format);
  }

  let raw: ImageData;
  try {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    if (format === "jpeg") {
      const { default: decode } = await import("@jsquash/jpeg/decode");
      raw = await decode(buffer);
    } else if (format === "png") {
      const { default: decode } = await import("@jsquash/png/decode");
      raw = await decode(buffer);
    } else {
      const { default: decode } = await import("@jsquash/webp/decode");
      raw = await decode(buffer);
    }
  } catch (cause) {
    throw new DecodeError(
      "corrupt",
      "That image file looks damaged or incomplete. Try uploading it again.",
      format
    );
  }

  // Orientation and ICC both live in EXIF/metadata; PNG and WebP rarely carry
  // orientation, so a failure here is not fatal.
  let orientation: Orientation = 1;
  let profileDescription: string | undefined;
  try {
    const exifr = await import("exifr");
    const meta = (await exifr.parse(bytes, { icc: true })) as
      | Record<string, unknown>
      | undefined;
    const o = Number(meta?.Orientation);
    if (Number.isInteger(o) && o >= 1 && o <= 8) orientation = o as Orientation;
    const desc = meta?.ProfileDescription ?? meta?.description;
    if (typeof desc === "string") profileDescription = desc;
  } catch {
    // No metadata, or a parser that could not read it. Defaults stand.
  }

  const upright = applyOrientation(
    raw.data as unknown as Uint8ClampedArray,
    raw.width,
    raw.height,
    orientation
  );

  return {
    data: upright.data,
    width: upright.width,
    height: upright.height,
    format,
    gamut: gamutFromProfileDescription(profileDescription),
    orientation,
    profileDescription,
  };
}
