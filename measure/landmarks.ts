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

export const MODEL_URLS = {
  landmarker:
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
  segmenter:
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
} as const;

/** Approximate download sizes, for progress reporting before Content-Length. */
export const MODEL_BYTES = {
  landmarker: 3_758_596,
  segmenter: 16_371_712,
} as const;

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

  /** Eye contours, used for the sclera patches and for eye-region exclusion. */
  leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],

  /** Cheek centres — the primary skin sampling sites. */
  leftCheek: [116, 117, 118, 119, 100, 126],
  rightCheek: [345, 346, 347, 348, 329, 355],

  /** Lower forehead, below the hairline and above the brows. */
  forehead: [151, 9, 107, 336, 108, 337],

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
        MODEL_URLS.landmarker,
        "landmarker",
        MODEL_BYTES.landmarker,
        onProgress
      ),
    ]);
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
      fetchWithProgress(MODEL_URLS.segmenter, "segmenter", MODEL_BYTES.segmenter, onProgress),
    ]);
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
