/**
 * The quality gate: is this photo good enough to measure colour from?
 *
 * Runs before any analysis, on the landmarker alone, so the user hears "move
 * closer" or "too dark" after a 3.7 MB download rather than a 20 MB one.
 *
 * Nothing here throws. A file we cannot decode is a quality issue with a
 * sentence the user can act on, not an exception — a HEIC upload should say
 * which iPhone setting to change, not "an error occurred".
 */

import {
  DecodeError,
  decodeImage,
  isSupported,
  sniffFormat,
  unsupportedFormatMessage,
  type DecodedImage,
} from "./decode";
import { labToLch, meanLinear, rgbToLab, type RGB } from "./color";
import {
  LANDMARKS,
  centroid,
  detectFaces,
  eyeDistance,
  faceHeightFraction,
  type Landmark,
} from "./landmarks";
import { discPixels, pixelAt, relativeLuminance, type ImageLike } from "./regions";

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every number here is an estimate — calibrate in Phase 4. They are deliberately
 * lenient: a false "your photo is bad" on a usable photo costs a user who then
 * cannot use the product at all, which is worse than measuring a mediocre photo
 * and reporting lower confidence.
 */
export const QUALITY = {
  /** Face-oval height as a fraction of frame height. estimate — calibrate in Phase 4 */
  minFaceHeightFraction: 0.2,
  /** Laplacian variance below this reads as out of focus. estimate — calibrate in Phase 4 */
  minLaplacianVariance: 60,
  /** Fraction of face pixels allowed to clip at either end. estimate — calibrate in Phase 4 */
  maxClippedFraction: 0.08,
  /** Face pixels at or above this are treated as blown. */
  highlightLevel: 250,
  /** Face pixels at or below this are treated as crushed. */
  shadowLevel: 6,
  /** Mean face luminance outside this band is too dark or too bright.
   *  estimate — calibrate in Phase 4 */
  luminanceRange: { min: 0.06, max: 0.82 },
  /** Sclera Lab a* / b* magnitude above this is a visible colour cast.
   *  estimate — calibrate in Phase 4 */
  maxScleraCast: 8,
  /** Skin high-frequency energy below this fraction of the eye region's reads as
   *  smoothed by a beauty filter. estimate — calibrate in Phase 4 */
  minSkinDetailRatio: 0.25,
  /** Overall score below this fails the gate. estimate — calibrate in Phase 4 */
  passScore: 0.6,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────────────

export type QualityIssueCode =
  | "unsupported_format"
  | "decoder_unavailable"
  | "corrupt"
  | "no_face"
  | "multiple_faces"
  | "face_too_small"
  | "blurry"
  | "too_dark"
  | "too_bright"
  | "clipped"
  | "colour_cast"
  | "filtered";

export interface QualityIssue {
  code: QualityIssueCode;
  /** A sentence to show the user, phrased as something they can do. */
  message: string;
  /** True when the photo cannot be measured at all, rather than measured badly. */
  fatal: boolean;
}

export interface QualityResult {
  ok: boolean;
  /** 0-1. Each non-fatal issue costs a fixed share. */
  score: number;
  issues: QualityIssue[];
  /** Present when the image decoded, so callers can reuse it. */
  image?: DecodedImage;
  /** Present when exactly one face was found. */
  landmarks?: Landmark[];
  metrics?: QualityMetrics;
}

export interface QualityMetrics {
  faceHeightFraction: number;
  laplacianVariance: number;
  meanLuminance: number;
  clippedFraction: number;
  scleraCast: number | null;
  skinDetailRatio: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics (pure — unit tested)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Variance of the Laplacian: the standard focus measure.
 *
 * A sharp image has strong second derivatives at edges and therefore high
 * variance; a blurred one has almost none.
 */
export function laplacianVariance(
  gray: Float32Array | number[],
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) return 0;
  const responses: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        4 * gray[i] -
        gray[i - 1] -
        gray[i + 1] -
        gray[i - width] -
        gray[i + width];
      responses.push(value);
    }
  }
  if (responses.length === 0) return 0;
  const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
  return responses.reduce((a, b) => a + (b - mean) ** 2, 0) / responses.length;
}

/** Fraction of samples at or beyond the clipping levels. */
export function clippedFraction(
  values: number[],
  shadowLevel: number,
  highlightLevel: number
): number {
  if (values.length === 0) return 0;
  let clipped = 0;
  for (const v of values) if (v <= shadowLevel || v >= highlightLevel) clipped++;
  return clipped / values.length;
}

/**
 * How far the sclera sits from neutral, as Lab chroma.
 *
 * The white of the eye is the most reliably neutral surface on a face, so its
 * chroma is a direct read of the light's colour cast.
 */
export function scleraCast(pixels: RGB[]): number | null {
  if (pixels.length < 20) return null;
  const linear = meanLinear(pixels);
  // Re-encode the linear mean so it goes through the same path as everything else.
  const encode = (c: number) =>
    c <= 0.0031308 ? c * 12.92 * 255 : (1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255;
  const lab = rgbToLab({ r: encode(linear.r), g: encode(linear.g), b: encode(linear.b) });
  return labToLch(lab).C;
}

/**
 * Mean absolute Laplacian response, a proxy for fine detail.
 *
 * Beauty filters smooth skin while leaving eyes and hair sharp, so comparing
 * skin detail against eye detail separates a filtered photo from a merely soft
 * one. An absolute threshold cannot: a low-light photo is soft everywhere.
 */
export function detailEnergy(
  gray: Float32Array | number[],
  width: number,
  height: number
): number {
  if (width < 3 || height < 3) return 0;
  let sum = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      sum += Math.abs(
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width]
      );
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Copy a rectangle out as a grayscale plane, for the focus measures. */
export function grayPatch(
  image: ImageLike,
  x0: number,
  y0: number,
  w: number,
  h: number
): { gray: Float32Array; width: number; height: number } {
  const width = Math.max(0, Math.min(w, image.width - x0));
  const height = Math.max(0, Math.min(h, image.height - y0));
  const gray = new Float32Array(Math.max(0, width * height));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = pixelAt(image, x0 + x, y0 + y);
      gray[y * width + x] = rgb ? relativeLuminance(rgb) * 255 : 0;
    }
  }
  return { gray, width, height };
}

// ─────────────────────────────────────────────────────────────────────────────
// Issue text
// ─────────────────────────────────────────────────────────────────────────────

const ISSUE_TEXT: Record<Exclude<QualityIssueCode, "unsupported_format" | "decoder_unavailable" | "corrupt">, string> = {
  no_face: "We couldn't find a face in this photo. Make sure your whole face is visible and facing the camera.",
  multiple_faces: "There's more than one face here. Please use a photo of just you.",
  face_too_small: "Your face is a little small in the frame. Move closer, or crop in so your face fills more of the photo.",
  blurry: "This photo looks out of focus. Hold steady and tap to focus before taking it.",
  too_dark: "This photo is quite dark. Try again facing a window in daylight.",
  too_bright: "This photo is overexposed. Move out of direct sun or turn off the flash.",
  clipped: "Parts of your face are blown out or lost in shadow. Even, indirect daylight works best.",
  colour_cast: "The lighting here has a strong colour cast, which changes how your colouring reads. Daylight near a window is ideal — avoid warm indoor bulbs.",
  filtered: "This photo looks smoothed or filtered, which hides your natural skin tone. Please use an unedited photo.",
};

function issue(code: QualityIssueCode, fatal: boolean, message?: string): QualityIssue {
  return {
    code,
    fatal,
    message: message ?? ISSUE_TEXT[code as keyof typeof ISSUE_TEXT],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The gate
// ─────────────────────────────────────────────────────────────────────────────

/** Each non-fatal issue costs this much of the score. */
const ISSUE_COST = 0.2;

function fail(code: QualityIssueCode, message?: string): QualityResult {
  return { ok: false, score: 0, issues: [issue(code, true, message)] };
}

/**
 * Assess a file. Never throws: decode problems come back as issues.
 *
 * Only the landmarker is needed, so this can run before the 16 MB segmenter has
 * finished downloading.
 */
export async function assessQuality(bytes: Uint8Array<ArrayBufferLike>): Promise<QualityResult> {
  // Sniff before decoding so an unsupported format gets its specific message.
  const format = sniffFormat(bytes);
  if (!isSupported(format)) {
    return fail("unsupported_format", unsupportedFormatMessage(format));
  }

  let image: DecodedImage;
  try {
    image = await decodeImage(bytes);
  } catch (error) {
    if (error instanceof DecodeError) {
      const code: QualityIssueCode =
        error.code === "decoder_unavailable"
          ? "decoder_unavailable"
          : error.code === "unsupported_format"
            ? "unsupported_format"
            : "corrupt";
      return fail(code, error.userMessage);
    }
    return fail("corrupt", "We couldn't read that photo. Please try a different one.");
  }

  const imageData: ImageLike = {
    data: image.data,
    width: image.width,
    height: image.height,
  };

  const { faces } = await detectFaces(
    new ImageData(
      image.data as Uint8ClampedArray<ArrayBuffer>,
      image.width,
      image.height
    )
  );
  if (faces.length === 0) return { ...fail("no_face"), image };
  if (faces.length > 1) return { ...fail("multiple_faces"), image };

  const landmarks = faces[0];
  const issues: QualityIssue[] = [];

  // ── Face size ──
  const faceFraction = faceHeightFraction(landmarks);
  if (faceFraction < QUALITY.minFaceHeightFraction) issues.push(issue("face_too_small", false));

  // ── Focus and exposure, measured on the face only ──
  const scale = eyeDistance(landmarks);
  const cheek = centroid(landmarks, LANDMARKS.leftCheek);
  const patchSize = Math.max(16, Math.round(scale * image.width * 0.6));
  const patch = grayPatch(
    imageData,
    Math.round(cheek.x * image.width - patchSize / 2),
    Math.round(cheek.y * image.height - patchSize / 2),
    patchSize,
    patchSize
  );
  const variance = laplacianVariance(patch.gray, patch.width, patch.height);
  if (variance < QUALITY.minLaplacianVariance) issues.push(issue("blurry", false));

  const faceSamples: number[] = [];
  let luminanceSum = 0;
  for (const point of [
    cheek,
    centroid(landmarks, LANDMARKS.rightCheek),
    centroid(landmarks, LANDMARKS.forehead),
  ]) {
    for (const { x, y } of discPixels(imageData, point, scale * 0.22)) {
      const rgb = pixelAt(imageData, x, y);
      if (!rgb) continue;
      faceSamples.push(Math.max(rgb.r, rgb.g, rgb.b));
      luminanceSum += relativeLuminance(rgb);
    }
  }
  const meanLuminance = faceSamples.length ? luminanceSum / faceSamples.length : 0;
  const clipped = clippedFraction(faceSamples, QUALITY.shadowLevel, QUALITY.highlightLevel);

  if (meanLuminance < QUALITY.luminanceRange.min) issues.push(issue("too_dark", false));
  else if (meanLuminance > QUALITY.luminanceRange.max) issues.push(issue("too_bright", false));
  if (clipped > QUALITY.maxClippedFraction) issues.push(issue("clipped", false));

  // ── Colour cast, read off the sclera ──
  //
  // Sampled between the iris and each eye corner, NOT at the eye centroid —
  // the centroid sits on the iris, so the first version sampled iris, rejected
  // it all on the brightness filter, and reported no cast at all on every photo.
  const scleraPixels: RGB[] = [];
  for (const [iris, corners] of [
    [LANDMARKS.leftIris, LANDMARKS.leftEyeCorners],
    [LANDMARKS.rightIris, LANDMARKS.rightEyeCorners],
  ] as const) {
    const irisCentre = centroid(landmarks, iris);
    if (!Number.isFinite(irisCentre.x)) continue;
    for (const cornerIndex of corners) {
      const corner = landmarks[cornerIndex];
      if (!corner) continue;
      // Two thirds of the way from the iris toward the corner: clear of the
      // iris edge, short of the lash line and the tear duct.
      const patch = {
        x: irisCentre.x + (corner.x - irisCentre.x) * 0.66,
        y: irisCentre.y + (corner.y - irisCentre.y) * 0.66,
      };
      for (const { x, y } of discPixels(imageData, patch, scale * 0.022)) {
        const rgb = pixelAt(imageData, x, y);
        // Keep only the brighter pixels: sclera, not lash shadow or lid.
        if (rgb && relativeLuminance(rgb) > 0.25) scleraPixels.push(rgb);
      }
    }
  }
  const cast = scleraCast(scleraPixels);
  if (cast !== null && cast > QUALITY.maxScleraCast) issues.push(issue("colour_cast", false));

  // ── Beauty-filter heuristic ──
  const eyePatchSize = Math.max(12, Math.round(scale * image.width * 0.25));
  const eyeCentre = centroid(landmarks, LANDMARKS.leftEye);
  const eyePatch = grayPatch(
    imageData,
    Math.round(eyeCentre.x * image.width - eyePatchSize / 2),
    Math.round(eyeCentre.y * image.height - eyePatchSize / 2),
    eyePatchSize,
    eyePatchSize
  );
  const skinDetail = detailEnergy(patch.gray, patch.width, patch.height);
  const eyeDetail = detailEnergy(eyePatch.gray, eyePatch.width, eyePatch.height);
  const detailRatio = eyeDetail > 0 ? skinDetail / eyeDetail : null;
  if (detailRatio !== null && detailRatio < QUALITY.minSkinDetailRatio) {
    issues.push(issue("filtered", false));
  }

  const score = Math.max(0, 1 - issues.length * ISSUE_COST);
  return {
    ok: score >= QUALITY.passScore,
    score,
    issues,
    image,
    landmarks,
    metrics: {
      faceHeightFraction: faceFraction,
      laplacianVariance: variance,
      meanLuminance,
      clippedFraction: clipped,
      scleraCast: cast,
      skinDetailRatio: detailRatio,
    },
  };
}
