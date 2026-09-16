/**
 * The whole browser-side measurement, start to finish.
 *
 * One entry point so the client and the eval run identical code — if the eval
 * and the app could drift, the eval would stop measuring the product.
 *
 * Stages are emitted as they actually happen. The loading UI is driven from
 * these events rather than from a timer, so what the user reads is what is
 * occurring.
 */

import { decodeImage, initDecoders, DecodeError, type DecodedImage } from "./decode";
import { toCanonicalJpeg, type CanonicalImage } from "./encode";
import { buildFeatures, type Features } from "./features";
import {
  detectFaces,
  loadLandmarker,
  loadSegmenter,
  segmentImage,
  type LoadProgress,
  type Landmark,
} from "./landmarks";
import { assessQuality, type QualityResult } from "./quality";
import { extractRegions } from "./regions";
import type { HairStatus } from "./seasons.config";

// ─────────────────────────────────────────────────────────────────────────────
// Stages
// ─────────────────────────────────────────────────────────────────────────────

export type StageName =
  | "decoding"
  | "checking"
  | "loading-face-model"
  | "loading-detail-model"
  | "measuring"
  | "preparing-upload";

export interface StageEvent {
  stage: StageName;
  /** 0-1 within this stage, when it is measurable (model downloads). */
  progress?: number;
  loadedBytes?: number;
  totalBytes?: number;
}

export type StageCallback = (event: StageEvent) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Result
// ─────────────────────────────────────────────────────────────────────────────

export interface MeasurementResult {
  kind: "measured";
  features: Features;
  quality: QualityResult;
  image: DecodedImage;
  upload: CanonicalImage;
  landmarks: Landmark[];
  /**
   * False when the segmenter did not arrive in time or produced nothing. Hair
   * is then excluded and the UI must say so — silently dropping a third of the
   * evidence is worse than a slower result.
   */
  hairAvailable: boolean;
  /** Human-readable note when hairAvailable is false. */
  hairNote?: string;
}

export interface QualityFailure {
  kind: "quality";
  quality: QualityResult;
}

export type PipelineResult = MeasurementResult | QualityFailure;

export interface PipelineOptions {
  hairStatus?: HairStatus;
  onStage?: StageCallback;
  /**
   * How long to wait for the segmenter after everything else is ready. The
   * model is 16 MB; on a slow connection the choice is between a long spinner
   * and a slightly worse answer, and a slightly worse answer wins.
   */
  segmenterTimeoutMs?: number;
  /** Where the codec .wasm files are served from. */
  wasmBase?: string;
}

export const DEFAULT_SEGMENTER_TIMEOUT_MS = 15_000;

const HAIR_UNAVAILABLE_NOTE =
  "We couldn't read your hair, so this uses your skin and eyes only.";

// ─────────────────────────────────────────────────────────────────────────────
// Prefetch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start both model downloads immediately, without awaiting them.
 *
 * Called on page load: the models are served from versioned, immutable URLs, so
 * this is a one-time cost that overlaps with the user choosing a photo instead
 * of stacking on top of it.
 */
export function prefetchModels(onProgress?: (p: LoadProgress) => void): void {
  void loadLandmarker(onProgress).catch(() => {});
  void loadSegmenter(onProgress).catch(() => {});
}

/** Resolve to null rather than hanging past `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decode, gate, measure.
 *
 * Returns a `quality` result instead of throwing when the photo is unusable —
 * including for a format we cannot read, which comes back as an issue naming
 * the fix rather than an exception.
 */
export async function runMeasurement(
  bytes: Uint8Array<ArrayBufferLike>,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const stage = options.onStage ?? (() => {});
  const hairStatus: HairStatus = options.hairStatus ?? "natural";
  const segmenterTimeout = options.segmenterTimeoutMs ?? DEFAULT_SEGMENTER_TIMEOUT_MS;

  if (options.wasmBase) await initDecoders(options.wasmBase);

  // ── Quality gate. Runs on the landmarker alone, so it answers after 3.7 MB. ──
  stage({ stage: "loading-face-model" });
  await loadLandmarker((p) =>
    stage({
      stage: "loading-face-model",
      progress: p.fraction,
      loadedBytes: p.loadedBytes,
      totalBytes: p.totalBytes,
    })
  );

  stage({ stage: "checking" });
  const quality = await assessQuality(bytes);
  if (!quality.ok || !quality.image || !quality.landmarks) {
    return { kind: "quality", quality };
  }

  stage({ stage: "decoding" });
  const image = quality.image;
  const landmarks = quality.landmarks;
  const imageData = new ImageData(
    new Uint8ClampedArray(image.data) as Uint8ClampedArray<ArrayBuffer>,
    image.width,
    image.height
  );

  // ── Hair. Skipped entirely when the user says it is dyed or covered. ──
  let segmentation: Uint8Array | null = null;
  let hairNote: string | undefined;

  if (hairStatus === "natural") {
    stage({ stage: "loading-detail-model" });
    const segmenter = await withTimeout(
      loadSegmenter((p) =>
        stage({
          stage: "loading-detail-model",
          progress: p.fraction,
          loadedBytes: p.loadedBytes,
          totalBytes: p.totalBytes,
        })
      ),
      segmenterTimeout
    );
    if (segmenter) {
      segmentation = await withTimeout(segmentImage(imageData), segmenterTimeout);
    }
    if (!segmentation) hairNote = HAIR_UNAVAILABLE_NOTE;
  }

  // ── Measure ──
  stage({ stage: "measuring" });
  const regions = extractRegions({ ...image }, landmarks, segmentation, {
    gamut: image.gamut,
  });

  // Without a mask there is no hair region, so tell buildFeatures the truth
  // rather than letting it read an empty region as a measurement.
  const effectiveHairStatus: HairStatus =
    hairStatus === "natural" && !segmentation ? "covered" : hairStatus;

  const features = buildFeatures(regions, {
    hairStatus: effectiveHairStatus,
    gamut: image.gamut,
  });

  // ── The image that gets uploaded ──
  stage({ stage: "preparing-upload" });
  const upload = await toCanonicalJpeg(image);

  return {
    kind: "measured",
    features,
    quality,
    image,
    upload,
    landmarks,
    hairAvailable: features.forScoring.hair !== null,
    hairNote:
      features.forScoring.hair === null
        ? (hairNote ?? HAIR_UNAVAILABLE_NOTE)
        : undefined,
  };
}

/** Re-export so callers need only this module. */
export { DecodeError };
export type { Features, QualityResult, DecodedImage, CanonicalImage };
