/**
 * MediaPipe face landmarks and hair segmentation.
 *
 * Two models, loaded lazily and cached for the page's lifetime:
 *
 *   face_landmarker.task              3.7 MB   478 landmarks incl. both irises
 *   selfie_multiclass_256x256.tflite   16 MB   background/hair/body-skin/face-skin/clothes/other
 *
 * The landmarker loads FIRST and on its own. It is a quarter the size and it is
 * all the quality gate needs — one face, face size, blur, exposure, sclera cast
 * — so the user gets "move closer" or "too dark" in a second or two rather than
 * after a 20 MB download. The segmenter is only needed once we are actually
 * measuring, so it loads after, with progress.
 *
 * Everything here takes and returns plain data. MediaPipe's `ImageSource` is
 * `TexImageSource`, which includes `ImageData`, so the pixels decode.ts produced
 * go straight in — one decode feeds both the models and our own sampling.
 */

import type { FaceLandmarker, ImageSegmenter } from "@mediapipe/tasks-vision";

/** tasks-vision declares WasmFileset but does not export it, so derive it. */
type WasmFileset = Awaited<
  ReturnType<typeof import("@mediapipe/tasks-vision").FilesetResolver.forVisionTasks>
>;

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pinned models.
 *
 * The paths end in `/1/`, not `/latest/`. `/latest/` is a moving pointer, and a
 * silent model update would change every measurement the eval has ever recorded
 * without anything in this repo changing — calibrated thresholds would quietly
 * stop matching the model they were calibrated against.
 *
 * The version path alone is not quite enough: these are mutable objects in a
 * Google bucket. So each download is checked against a SHA-256 recorded here,
 * and a mismatch throws rather than proceeding. A model change becomes a loud
 * failure instead of a silent drift in the numbers.
 *
 * Set MEASURE_MODEL_BASE to serve these from your own origin instead (e.g.
 * "/models/" with the files under client/public/models/). The integrity check
 * still applies, so a self-hosted copy has to be the same bytes.
 */
export const MODEL_SPECS = {
  landmarker: {
    path: "face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    file: "face_landmarker.task",
    bytes: 3_758_596,
    sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
  },
  segmenter: {
    path: "image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite",
    file: "selfie_multiclass_256x256.tflite",
    bytes: 16_371_837,
    sha256: "c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0",
  },
} as const;

const MEDIAPIPE_CDN = "https://storage.googleapis.com/mediapipe-models/";

/** Override to self-host. Trailing slash required; files are looked up by name. */
export let modelBase: string | undefined;

export function setModelBase(base: string | undefined): void {
  modelBase = base;
  resetModels();
}

export function modelUrl(stage: LoadStage): string {
  const spec = MODEL_SPECS[stage];
  return modelBase ? `${modelBase}${spec.file}` : `${MEDIAPIPE_CDN}${spec.path}`;
}

/** Kept for callers that only want the byte totals. */
export const MODEL_BYTES = {
  landmarker: MODEL_SPECS.landmarker.bytes,
  segmenter: MODEL_SPECS.segmenter.bytes,
} as const;

/** Hex SHA-256 of a buffer, via WebCrypto (present in browsers and Node 24). */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Throws unless the bytes match the recorded hash. */
export async function verifyModel(stage: LoadStage, buffer: ArrayBuffer): Promise<void> {
  const expected = MODEL_SPECS[stage].sha256;
  const actual = await sha256Hex(buffer);
  if (actual !== expected) {
    throw new Error(
      `${stage} model integrity check failed. Expected SHA-256 ${expected}, got ${actual}. ` +
        `The pinned model has changed — measurements would no longer match the calibrated ` +
        `thresholds. Re-verify and update MODEL_SPECS deliberately.`
    );
  }
}

/** WASM bundle for the tasks-vision runtime. */
const WASM_ROOT = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";

/**
 * Category indices emitted by selfie_multiclass_256x256.
 * Fixed by the model — not a tuning knob.
 */
export const SEGMENT_CLASS = {
  background: 0,
  hair: 1,
  bodySkin: 2,
  faceSkin: 3,
  clothes: 4,
  other: 5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Progress
// ─────────────────────────────────────────────────────────────────────────────

export type LoadStage = "landmarker" | "segmenter";

export interface LoadProgress {
  stage: LoadStage;
  /** 0-1 for this stage. */
  fraction: number;
  loadedBytes: number;
  totalBytes: number;
}

export type ProgressCallback = (progress: LoadProgress) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Landmark index sets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Indices into the 478-point face mesh.
 *
 * NOT YET VISUALLY VERIFIED. These come from the published MediaPipe face-mesh
 * topology, but which points sit on a cheek versus a jawline is the kind of
 * thing that has to be checked by drawing them on a real face in the browser.
 * Treat a region that measures oddly as a suspect index set first.
 */
export const LANDMARKS = {
  /** Both irises. The last ten points of the mesh, present only with
   *  outputFaceBlendshapes/refineLandmarks enabled. */
  leftIris: [468, 469, 470, 471, 472],
  rightIris: [473, 474, 475, 476, 477],

  /** Eye corners: [outer, inner]. The sclera lives between the iris and these,
   *  not at the eye centroid — which is the iris. */
  leftEyeCorners: [33, 133],
  rightEyeCorners: [263, 362],

  /** Eye contours, used for eye-region exclusion. */
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],

  /** Cheek centres — the primary skin sampling sites. */
  leftCheek: [116, 117, 118, 119, 100, 126],
  rightCheek: [345, 346, 347, 348, 329, 355],

  /** Mid-forehead: below the hairline, well above the brows. The earlier set
   *  ([151, 9, 107, 336, 108, 337]) centred on the glabella, which sits inside
   *  both brow exclusion zones — visible in the overlay tool. */
  forehead: [10, 151, 108, 337],

  /** Brows, excluded from skin. */
  leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
  rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],

  /** Outer lip contour. */
  lips: [
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
  ],

  /** Face oval, for the face-size check and the hairline boundary. */
  faceOval: [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400,
    377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Geometry (pure — unit tested)
// ─────────────────────────────────────────────────────────────────────────────

/** A landmark in normalised image coordinates, 0-1. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export function centroid(landmarks: Landmark[], indices: readonly number[]): Point {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const i of indices) {
    const lm = landmarks[i];
    if (!lm) continue;
    x += lm.x;
    y += lm.y;
    n++;
  }
  return n === 0 ? { x: NaN, y: NaN } : { x: x / n, y: y / n };
}

export function boundingBox(
  landmarks: Landmark[],
  indices: readonly number[]
): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const i of indices) {
    const lm = landmarks[i];
    if (!lm) continue;
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Face height as a fraction of frame height.
 *
 * Landmarks are already normalised to the frame, so the face-oval bounding box
 * height *is* the fraction. The quality gate wants this at roughly 0.2 or more.
 */
export function faceHeightFraction(landmarks: Landmark[]): number {
  return boundingBox(landmarks, LANDMARKS.faceOval).height;
}

/** Interocular distance in normalised units — the natural scale for patch radii. */
export function eyeDistance(landmarks: Landmark[]): number {
  const l = centroid(landmarks, LANDMARKS.leftEye);
  const r = centroid(landmarks, LANDMARKS.rightEye);
  return Math.hypot(r.x - l.x, r.y - l.y);
}

// ─────────────────────────────────────────────────────────────────────────────
// Model loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch with progress. Falls back to a single 0-to-1 report when the server
 * does not send Content-Length (which CDNs often omit for compressed bodies).
 */
async function fetchWithProgress(
  url: string,
  stage: LoadStage,
  fallbackTotal: number,
  onProgress?: ProgressCallback
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${stage} model: HTTP ${response.status}`);
  }

  const declared = Number(response.headers.get("content-length"));
  const total = Number.isFinite(declared) && declared > 0 ? declared : fallbackTotal;

  if (!response.body || !onProgress) {
    const buffer = await response.arrayBuffer();
    onProgress?.({ stage, fraction: 1, loadedBytes: buffer.byteLength, totalBytes: total });
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress({
      stage,
      fraction: Math.min(1, loaded / total),
      loadedBytes: loaded,
      totalBytes: total,
    });
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress({ stage, fraction: 1, loadedBytes: loaded, totalBytes: loaded });
  return merged.buffer;
}

let visionFileset: Promise<WasmFileset> | undefined;
let landmarkerPromise: Promise<FaceLandmarker> | undefined;
let segmenterPromise: Promise<ImageSegmenter> | undefined;

async function fileset(): Promise<WasmFileset> {
  visionFileset ??= (async () => {
    const { FilesetResolver } = await import("@mediapipe/tasks-vision");
    return FilesetResolver.forVisionTasks(WASM_ROOT);
  })();
  return visionFileset;
}

/**
 * Load the face landmarker. Cached — later calls return the same instance.
 *
 * Deliberately separate from the segmenter so the quality gate can run after
 * 3.7 MB instead of 20 MB.
 */
export function loadLandmarker(onProgress?: ProgressCallback): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
    const [vision, modelAssetBuffer] = await Promise.all([
      fileset(),
      fetchWithProgress(
        modelUrl("landmarker"),
        "landmarker",
        MODEL_SPECS.landmarker.bytes,
        onProgress
      ),
    ]);
    await verifyModel("landmarker", modelAssetBuffer);
    return FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: new Uint8Array(modelAssetBuffer),
        // CPU: headless Chromium and WebKit under Playwright frequently have no
        // usable GPU, and determinism matters more here than speed.
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      // Needed for the iris landmarks (468-477).
      outputFaceBlendshapes: false,
      numFaces: 2, // detect a second face so the gate can report it
    });
  })();
  return landmarkerPromise;
}

/** Load the multiclass selfie segmenter. Cached. Call after the landmarker. */
export function loadSegmenter(onProgress?: ProgressCallback): Promise<ImageSegmenter> {
  segmenterPromise ??= (async () => {
    const { ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const [vision, modelAssetBuffer] = await Promise.all([
      fileset(),
      fetchWithProgress(
        modelUrl("segmenter"),
        "segmenter",
        MODEL_SPECS.segmenter.bytes,
        onProgress
      ),
    ]);
    await verifyModel("segmenter", modelAssetBuffer);
    return ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetBuffer: new Uint8Array(modelAssetBuffer),
        delegate: "CPU",
      },
      runningMode: "IMAGE",
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  })();
  return segmenterPromise;
}

/** Drop both models. Tests and long-lived pages that want the memory back. */
export function resetModels(): void {
  visionFileset = undefined;
  landmarkerPromise = undefined;
  segmenterPromise = undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detection
// ─────────────────────────────────────────────────────────────────────────────

export interface FaceDetection {
  /** Empty when no face was found; length > 1 means the gate should complain. */
  faces: Landmark[][];
}

export async function detectFaces(image: ImageData): Promise<FaceDetection> {
  const landmarker = await loadLandmarker();
  const result = landmarker.detect(image);
  return { faces: (result.faceLandmarks ?? []) as Landmark[][] };
}

/**
 * Per-pixel class indices at the image's own resolution.
 *
 * MediaPipe runs the segmenter at 256x256 and returns a mask at that size, so
 * this nearest-neighbour samples it back up. Nearest rather than interpolated on
 * purpose: these are class labels, and a blend of "hair" and "background" is not
 * a class.
 */
export async function segmentImage(image: ImageData): Promise<Uint8Array> {
  const segmenter = await loadSegmenter();
  const result = segmenter.segment(image);
  const mask = result.categoryMask;
  if (!mask) throw new Error("Segmenter returned no category mask");

  const source = mask.getAsUint8Array();
  const maskW = mask.width;
  const maskH = mask.height;
  const out = new Uint8Array(image.width * image.height);

  for (let y = 0; y < image.height; y++) {
    const sy = Math.min(maskH - 1, Math.floor((y * maskH) / image.height));
    for (let x = 0; x < image.width; x++) {
      const sx = Math.min(maskW - 1, Math.floor((x * maskW) / image.width));
      out[y * image.width + x] = source[sy * maskW + sx];
    }
  }
  mask.close();
  return out;
}
