import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { initCodecs } from "./helpers/initCodecs";
import { labToLch, median, rgbToLab, type Lab, type RGB } from "../measure/color";
import {
  DecodeError,
  applyOrientation,
  decodeImage,
  isDecoderUnavailable,
  gamutFromProfileDescription,
  isSupported,
  orientationSwapsAxes,
  sniffFormat,
  unsupportedFormatMessage,
  type Orientation,
} from "../measure/decode";

/** Minimal byte headers, long enough for the sniffer's 12-byte minimum. */
type Bytes = Uint8Array<ArrayBufferLike>;

function header(...bytes: number[]): Bytes {
  const out = new Uint8Array(32);
  out.set(bytes);
  return out;
}

function ascii(offset: number, text: string, into: Bytes = new Uint8Array(32)): Bytes {
  for (let i = 0; i < text.length; i++) into[offset + i] = text.charCodeAt(i);
  return into;
}

describe("sniffFormat reads magic bytes, not extensions", () => {
  it("identifies the supported formats", () => {
    expect(sniffFormat(header(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
    expect(sniffFormat(header(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("png");
    const webp = ascii(8, "WEBP", ascii(0, "RIFF"));
    expect(sniffFormat(webp)).toBe("webp");
  });

  it("identifies HEIC across its brand codes", () => {
    for (const brand of ["heic", "heix", "mif1", "msf1", "hevc"]) {
      const buf = ascii(8, brand, ascii(4, "ftyp"));
      expect(sniffFormat(buf), brand).toBe("heic");
    }
  });

  it("distinguishes AVIF from HEIC despite the shared container", () => {
    expect(sniffFormat(ascii(8, "avif", ascii(4, "ftyp")))).toBe("avif");
    expect(sniffFormat(ascii(8, "avis", ascii(4, "ftyp")))).toBe("avif");
  });

  it("identifies other formats we decline", () => {
    expect(sniffFormat(header(0x47, 0x49, 0x46, 0x38))).toBe("gif");
    expect(sniffFormat(header(0x42, 0x4d))).toBe("bmp");
    expect(sniffFormat(header(0x49, 0x49, 0x2a, 0x00))).toBe("tiff");
    expect(sniffFormat(header(0x4d, 0x4d, 0x00, 0x2a))).toBe("tiff");
  });

  it("returns unknown for junk and for truncated input", () => {
    expect(sniffFormat(header(0x00, 0x01, 0x02, 0x03))).toBe("unknown");
    expect(sniffFormat(new Uint8Array([0xff, 0xd8]))).toBe("unknown");
    expect(sniffFormat(new Uint8Array(0))).toBe("unknown");
  });

  it("is not fooled by a HEIC renamed to .jpg", () => {
    // The exact case that reaches the server today: extension says JPEG,
    // multer's extension filter lets it through, and sharp then rejects it.
    const heicBytes = ascii(8, "heic", ascii(4, "ftyp"));
    expect(sniffFormat(heicBytes)).toBe("heic");
    expect(isSupported(sniffFormat(heicBytes))).toBe(false);
  });
});

describe("unsupported formats produce a user-facing message, not a throw", () => {
  it("names HEIC and tells the user what to change", () => {
    const msg = unsupportedFormatMessage("heic");
    expect(msg).toMatch(/HEIC/);
    expect(msg).toMatch(/Most Compatible|JPEG/);
    expect(msg.length).toBeGreaterThan(40);
  });

  it("has a message for every format we decline", () => {
    for (const f of ["heic", "avif", "gif", "bmp", "tiff", "unknown"] as const) {
      const msg = unsupportedFormatMessage(f);
      expect(msg, f).toBeTruthy();
      // Plain prose the UI can show as-is.
      expect(msg, f).not.toMatch(/undefined|\[object|Error:/);
    }
  });

  it("returns nothing for formats we can read", () => {
    for (const f of ["jpeg", "png", "webp"] as const) {
      expect(unsupportedFormatMessage(f)).toBe("");
    }
  });
});

describe("EXIF orientation", () => {
  /** A 2x1 image: left pixel red, right pixel green. */
  function twoByOne(): Uint8ClampedArray {
    return new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
  }
  const px = (d: Uint8ClampedArray, i: number) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];

  it("leaves an upright image untouched", () => {
    const data = twoByOne();
    const r = applyOrientation(data, 2, 1, 1);
    expect(r.data).toBe(data);
    expect([r.width, r.height]).toEqual([2, 1]);
  });

  it("mirrors horizontally for orientation 2", () => {
    const r = applyOrientation(twoByOne(), 2, 1, 2);
    expect(px(r.data, 0)).toEqual([0, 255, 0]);
    expect(px(r.data, 1)).toEqual([255, 0, 0]);
  });

  it("rotates 180 for orientation 3", () => {
    const r = applyOrientation(twoByOne(), 2, 1, 3);
    expect(px(r.data, 0)).toEqual([0, 255, 0]);
  });

  it("swaps the axes for orientations 5-8", () => {
    for (const o of [5, 6, 7, 8] as Orientation[]) {
      expect(orientationSwapsAxes(o), String(o)).toBe(true);
      const r = applyOrientation(twoByOne(), 2, 1, o);
      expect([r.width, r.height], String(o)).toEqual([1, 2]);
    }
    for (const o of [1, 2, 3, 4] as Orientation[]) {
      expect(orientationSwapsAxes(o), String(o)).toBe(false);
    }
  });

  it("puts the first pixel where a 90-degree rotation should", () => {
    // Orientation 6 is the common portrait-phone case: rotate 90 CW.
    const r = applyOrientation(twoByOne(), 2, 1, 6);
    expect([r.width, r.height]).toEqual([1, 2]);
    expect(px(r.data, 0)).toEqual([255, 0, 0]);
    expect(px(r.data, 1)).toEqual([0, 255, 0]);
  });

  it("preserves every pixel, losing none", () => {
    const w = 4;
    const h = 3;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = i * 10;
      data[i * 4 + 3] = 255;
    }
    for (const o of [2, 3, 4, 5, 6, 7, 8] as Orientation[]) {
      const r = applyOrientation(data, w, h, o);
      const reds = new Set<number>();
      for (let i = 0; i < w * h; i++) reds.add(r.data[i * 4]);
      expect(reds.size, `orientation ${o}`).toBe(w * h);
    }
  });
});

describe("ICC profile to gamut", () => {
  it("recognises Display P3", () => {
    for (const d of ["Display P3", "display p3", "Apple Display P3", "DCI-P3"]) {
      expect(gamutFromProfileDescription(d), d).toBe("display-p3");
    }
  });

  it("recognises sRGB", () => {
    for (const d of ["sRGB IEC61966-2.1", "sRGB", "SRGB v4"]) {
      expect(gamutFromProfileDescription(d), d).toBe("srgb");
    }
  });

  it("records an assumption rather than guessing, for anything else", () => {
    expect(gamutFromProfileDescription(undefined)).toBe("assumed-srgb");
    expect(gamutFromProfileDescription("")).toBe("assumed-srgb");
    expect(gamutFromProfileDescription("Adobe RGB (1998)")).toBe("assumed-srgb");
    expect(gamutFromProfileDescription("ProPhoto RGB")).toBe("assumed-srgb");
  });
});

describe("decoder availability is not blamed on the user's photo", () => {
  it("recognises an infrastructure failure", () => {
    expect(isDecoderUnavailable(new TypeError("fetch failed"))).toBe(true);
    expect(isDecoderUnavailable(new Error("Failed to load dynamically imported module"))).toBe(true);
    expect(isDecoderUnavailable(new Error("WebAssembly.instantiate failed"))).toBe(true);
  });

  it("does not mistake a genuine decode failure for one", () => {
    expect(isDecoderUnavailable(new Error("Decoding error"))).toBe(false);
    expect(isDecoderUnavailable(new Error("Invalid JPEG marker"))).toBe(false);
  });
});

describe("real iPhone fixtures", () => {
  const p3 = path.join(__dirname, "fixtures/color/iphone-p3-hand.jpg");
  const heic = path.join(__dirname, "fixtures/color/iphone-heic-sample.heic");

  beforeAll(async () => {
    if (fs.existsSync(p3)) await initCodecs();
  });

  it.skipIf(!fs.existsSync(heic))("sniffs a straight-from-camera HEIC", () => {
    const bytes = new Uint8Array(fs.readFileSync(heic).subarray(0, 64));
    expect(sniffFormat(bytes)).toBe("heic");
    expect(isSupported(sniffFormat(bytes))).toBe(false);
  });

  it.skipIf(!fs.existsSync(heic))("refuses HEIC with a message, not a crash", async () => {
    const bytes = new Uint8Array(fs.readFileSync(heic));
    const error = await decodeImage(bytes).catch((e) => e);
    expect(error).toBeInstanceOf(DecodeError);
    expect(error.code).toBe("unsupported_format");
    expect(error.format).toBe("heic");
    expect(error.userMessage).toMatch(/HEIC/);
  });

  it.skipIf(!fs.existsSync(p3))("reads Display P3 off a real iPhone JPEG", async () => {
    const decoded = await decodeImage(new Uint8Array(fs.readFileSync(p3)));
    expect(decoded.format).toBe("jpeg");
    expect(decoded.profileDescription).toMatch(/Display P3/i);
    expect(decoded.gamut).toBe("display-p3");
    expect(decoded.width).toBeGreaterThan(0);
    expect(decoded.height).toBeGreaterThan(0);
  });

  /**
   * The measurement that justifies reading the ICC profile at all. Measuring a
   * Display P3 photo as sRGB moves skin hue angle by ~4 degrees — with
   * HUE.skinByBand span at 10, that is 0.4 of the entire normalised half-axis,
   * enough to move an undertone label from neutral-warm to warm.
   */
  it.skipIf(!fs.existsSync(p3))("shifts skin hue angle measurably", async () => {
    const img = await decodeImage(new Uint8Array(fs.readFileSync(p3)));
    const { data, width, height } = img;
    const skin: RGB[] = [];
    for (let y = Math.floor(height * 0.25); y < height * 0.75; y += 8) {
      for (let x = Math.floor(width * 0.25); x < width * 0.75; x += 8) {
        const i = (y * width + x) * 4;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        if (r > g && g > b && r > 60 && r < 250 && r - b > 15 && r - b < 130) {
          skin.push({ r, g, b });
        }
      }
    }
    expect(skin.length).toBeGreaterThan(1000);

    const hueOf = (gamut: "srgb" | "display-p3") => {
      const labs: Lab[] = skin.map((p) => rgbToLab(p, gamut));
      const m: Lab = {
        L: median(labs.map((l) => l.L)),
        a: median(labs.map((l) => l.a)),
        b: median(labs.map((l) => l.b)),
      };
      return labToLch(m).h;
    };

    const asSrgb = hueOf("srgb");
    const asP3 = hueOf("display-p3");
    const shift = asP3 - asSrgb;

    // Correct handling reads the skin COOLER than the naive sRGB assumption.
    expect(shift).toBeLessThan(0);
    expect(Math.abs(shift)).toBeGreaterThan(2);
    expect(Math.abs(shift)).toBeLessThan(10);
  });
});
