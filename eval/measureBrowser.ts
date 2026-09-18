/**
 * Browser half of the eval: measurement, run in headless Chromium.
 *
 * Bundled by eval/measure.ts and executed in a real browser because that is the
 * only place measure/ can run — the @jsquash codecs and MediaPipe's WASM runtime
 * both fetch over HTTP. Running the same module the app runs is the point: an
 * eval measuring something else would stop measuring the product.
 */

import { decodeImage, initDecoders } from "../measure/decode";
import { buildFeatures } from "../measure/features";
import { detectFaces, loadLandmarker, loadSegmenter, segmentImage } from "../measure/landmarks";
import { extractRegions } from "../measure/regions";
import { assessQuality } from "../measure/quality";
import type { HairStatus } from "../measure/seasons.config";
import type { MeasuredFeatures } from "../measure/score";

export interface BrowserMeasurement {
  ok: boolean;
  error?: string;
  features?: MeasuredFeatures;
  /** Region pixel counts, so a bad segmentation is visible in the results file. */
  coverage?: Record<string, number>;
  qualityOk?: boolean;
  qualityIssues?: string[];
  gamut?: string;
  hairAvailable?: boolean;
}

async function measure(url: string, hairStatus: HairStatus): Promise<BrowserMeasurement> {
  try {
    await initDecoders("/wasm/");
    await loadLandmarker();

    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());

    const quality = await assessQuality(bytes);
    const qualityIssues = quality.issues.map((i) => i.code);

    // A failing gate is recorded, not fatal: the eval wants to know how a real
    // photo scores even when the gate would have asked for a retake.
    const image = quality.image ?? (await decodeImage(bytes));
    const imageData = new ImageData(
      new Uint8ClampedArray(image.data) as Uint8ClampedArray<ArrayBuffer>,
      image.width,
      image.height
    );

    const faces = quality.landmarks ? [quality.landmarks] : (await detectFaces(imageData)).faces;
    if (faces.length !== 1) {
      return { ok: false, error: `expected one face, found ${faces.length}`, qualityIssues };
    }

    let segmentation: Uint8Array | null = null;
    if (hairStatus === "natural") {
      await loadSegmenter();
      segmentation = await segmentImage(imageData);
    }

    const regions = extractRegions(
      { data: image.data, width: image.width, height: image.height },
      faces[0],
      segmentation,
      { gamut: image.gamut }
    );

    const features = buildFeatures(regions, {
      hairStatus: hairStatus === "natural" && !segmentation ? "covered" : hairStatus,
      gamut: image.gamut,
    });

    return {
      ok: true,
      features: features.forScoring,
      coverage: features.coverage,
      qualityOk: quality.ok,
      qualityIssues,
      gamut: image.gamut,
      hairAvailable: features.forScoring.hair !== null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

declare global {
  interface Window {
    __auraEval: { measure: typeof measure };
  }
}

window.__auraEval = { measure };
