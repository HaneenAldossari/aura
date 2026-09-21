/**
 * Browser half of the region-overlay dev tool.
 *
 * Bundled by scripts/dev/overlay.ts and run inside headless Chromium, because
 * landmarks.ts and regions.ts need a real browser: MediaPipe's WASM runtime and
 * the @jsquash codecs both fetch over HTTP. This is the only way to exercise
 * them short of the full Playwright eval.
 *
 * Dev-only. Nothing in measure/, server/ or client/ imports this.
 */

import { decodeImage, initDecoders } from "../../measure/decode";
import { labToLch, median, type Lab } from "../../measure/color";
// The same estimator the pipeline uses. The overlay had its own copy, which
// meant the tool for checking the measurement could disagree with it — and did,
// silently, for one commit.
import { diffusePixels } from "../../measure/features";
import { median as med2 } from "../../measure/color";
import {
  LANDMARKS,
  SEGMENT_CLASS,
  centroid,
  detectFaces,
  eyeDistance,
  loadLandmarker,
  loadSegmenter,
  segmentImage,
  type Landmark,
} from "../../measure/landmarks";
import {
  discPixels,
  extractRegions,
  regionCoverage,
  skinExclusionZones,
  type ImageLike,
  type RegionName,
} from "../../measure/regions";
import { assessQuality } from "../../measure/quality";

export interface RegionReport {
  name: RegionName;
  count: number;
  considered: number;
  unavailable?: string;
  medianLab: { L: number; a: number; b: number } | null;
  lch: { L: number; C: number; h: number } | null;
}

export interface OverlayReport {
  file: string;
  width: number;
  height: number;
  gamut: string;
  profileDescription?: string;
  quality: {
    ok: boolean;
    score: number;
    issues: { code: string; message: string }[];
    metrics: Record<string, number | null> | null;
  };
  regions: RegionReport[];
  coverage: Record<string, number>;
  /** PNG data URL of the annotated image. */
  overlayPng: string;
}

/** Per-region overlay colours, kept distinct at low opacity. */
const REGION_COLOUR: Record<RegionName, string> = {
  skin: "#34d399", // green
  hair: "#a78bfa", // violet
  eyes: "#38bdf8", // sky
  lips: "#fb7185", // rose
};

const MASK_COLOUR = {
  hair: [167, 139, 250] as const,
  faceSkin: [52, 211, 153] as const,
};

function summarise(pixels: Lab[]): Pick<RegionReport, "medianLab" | "lch"> {
  if (pixels.length === 0) return { medianLab: null, lch: null };
  pixels = diffusePixels(pixels);
  const med: Lab = {
    L: median(pixels.map((p) => p.L)),
    a: median(pixels.map((p) => p.a)),
    b: median(pixels.map((p) => p.b)),
  };
  const lch = labToLch(med);
  const r3 = (n: number) => Math.round(n * 100) / 100;
  return {
    medianLab: { L: r3(med.L), a: r3(med.a), b: r3(med.b) },
    lch: { L: r3(lch.L), C: r3(lch.C), h: r3(lch.h) },
  };
}

/**
 * Draw the overlay: masks underneath at low opacity, then the exclusion zones,
 * then the discs actually sampled. Order matters — the sampled discs must be
 * the most visible thing, since they are what the measurement used.
 */
function drawOverlay(
  image: ImageLike,
  landmarks: Landmark[],
  segmentation: Uint8Array | null
): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;

  ctx.putImageData(
    new ImageData(
      new Uint8ClampedArray(image.data) as Uint8ClampedArray<ArrayBuffer>,
      image.width,
      image.height
    ),
    0,
    0
  );

  // ── Segmentation masks, faint ──
  if (segmentation) {
    const overlay = ctx.getImageData(0, 0, image.width, image.height);
    for (let i = 0; i < segmentation.length; i++) {
      const cls = segmentation[i];
      const colour =
        cls === SEGMENT_CLASS.hair
          ? MASK_COLOUR.hair
          : cls === SEGMENT_CLASS.faceSkin
            ? MASK_COLOUR.faceSkin
            : null;
      if (!colour) continue;
      const o = i * 4;
      const alpha = 0.28;
      overlay.data[o] = overlay.data[o] * (1 - alpha) + colour[0] * alpha;
      overlay.data[o + 1] = overlay.data[o + 1] * (1 - alpha) + colour[1] * alpha;
      overlay.data[o + 2] = overlay.data[o + 2] * (1 - alpha) + colour[2] * alpha;
    }
    ctx.putImageData(overlay, 0, 0);
  }

  const scale = eyeDistance(landmarks);
  const lineWidth = Math.max(1, Math.round(image.width / 500));

  // ── Exclusion zones: dashed red, nothing filled ──
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([lineWidth * 4, lineWidth * 3]);
  for (const zone of skinExclusionZones(landmarks, scale)) {
    ctx.beginPath();
    ctx.arc(
      zone.centre.x * image.width,
      zone.centre.y * image.height,
      zone.radiusFraction * image.width,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // ── Sampled discs ──
  const discs: [RegionName, { x: number; y: number }, number][] = [
    ["skin", centroid(landmarks, LANDMARKS.leftCheek), scale * 0.22],
    ["skin", centroid(landmarks, LANDMARKS.rightCheek), scale * 0.22],
    ["skin", centroid(landmarks, LANDMARKS.forehead), scale * 0.22],
    ["eyes", centroid(landmarks, LANDMARKS.leftIris), scale * 0.055],
    ["eyes", centroid(landmarks, LANDMARKS.rightIris), scale * 0.055],
    ["lips", centroid(landmarks, LANDMARKS.lips), scale * 0.12],
  ];

  for (const [name, centre, radius] of discs) {
    if (!Number.isFinite(centre.x)) continue;
    const cx = centre.x * image.width;
    const cy = centre.y * image.height;
    const r = radius * image.width;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = `${REGION_COLOUR[name]}40`;
    ctx.fill();
    ctx.strokeStyle = REGION_COLOUR[name];
    ctx.lineWidth = lineWidth * 1.5;
    ctx.stroke();
  }

  // ── Sclera patches (what the colour-cast check reads) ──
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = lineWidth * 1.5;
  for (const [iris, corners] of [
    [LANDMARKS.leftIris, LANDMARKS.leftEyeCorners],
    [LANDMARKS.rightIris, LANDMARKS.rightEyeCorners],
  ] as const) {
    const irisCentre = centroid(landmarks, iris);
    if (!Number.isFinite(irisCentre.x)) continue;
    for (const cornerIndex of corners) {
      const corner = landmarks[cornerIndex];
      if (!corner) continue;
      ctx.beginPath();
      ctx.arc(
        (irisCentre.x + (corner.x - irisCentre.x) * 0.66) * image.width,
        (irisCentre.y + (corner.y - irisCentre.y) * 0.66) * image.height,
        scale * 0.022 * image.width,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }

  // ── Legend ──
  const pad = Math.round(image.width * 0.02);
  const fontSize = Math.max(12, Math.round(image.width / 45));
  ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "top";
  const entries: [string, string][] = [
    ["skin disc", REGION_COLOUR.skin],
    ["hair mask", REGION_COLOUR.hair],
    ["iris disc", REGION_COLOUR.eyes],
    ["lip disc", REGION_COLOUR.lips],
    ["sclera", "#fbbf24"],
    ["excluded", "#ef4444"],
  ];
  const boxH = entries.length * (fontSize * 1.5) + pad;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(pad, pad, fontSize * 9, boxH);
  entries.forEach(([label, colour], i) => {
    const y = pad + pad / 2 + i * fontSize * 1.5;
    ctx.fillStyle = colour;
    ctx.fillRect(pad * 1.5, y + fontSize * 0.2, fontSize * 0.7, fontSize * 0.7);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, pad * 1.5 + fontSize * 1.2, y);
  });

  return canvas.toDataURL("image/png");
}

/** Entry point invoked from Playwright. */
export async function analyse(
  file: string,
  onStage?: (stage: string) => void
): Promise<OverlayReport> {
  let current = "start";
  const stage = (name: string) => {
    current = name;
    onStage?.(name);
  };
  try {
    return await run(file, stage);
  } catch (error) {
    const e = error as Error & { cause?: Error };
    const cause = e.cause ? ` (cause: ${e.cause.message})` : "";
    throw new Error(`[stage: ${current}] ${e.name}: ${e.message}${cause}`);
  }
}

async function run(
  file: string,
  onStage: (stage: string) => void
): Promise<OverlayReport> {
  onStage?.("codecs");
  await initDecoders("/wasm/");

  const bytes = new Uint8Array(await (await fetch(file)).arrayBuffer());

  onStage?.("landmarker");
  await loadLandmarker();

  onStage?.("quality");
  const quality = await assessQuality(bytes);

  onStage?.("decode");
  const image = await decodeImage(bytes);
  const imageLike: ImageLike = {
    data: image.data,
    width: image.width,
    height: image.height,
  };
  const imageData = new ImageData(
    new Uint8ClampedArray(image.data) as Uint8ClampedArray<ArrayBuffer>,
    image.width,
    image.height
  );

  const { faces } = await detectFaces(imageData);
  if (faces.length !== 1) {
    throw new Error(`expected exactly one face, found ${faces.length}`);
  }
  const landmarks = faces[0];

  onStage?.("segmenter");
  await loadSegmenter();
  const segmentation = await segmentImage(imageData);

  onStage?.("regions");
  const regions = extractRegions(imageLike, landmarks, segmentation, {
    gamut: image.gamut,
  });

  const report: RegionReport[] = (
    ["skin", "hair", "eyes", "lips"] as RegionName[]
  ).map((name) => ({
    name,
    count: regions[name].count,
    considered: regions[name].considered,
    unavailable: regions[name].unavailable,
    ...summarise(regions[name].pixels),
  }));

  onStage?.("overlay");
  return {
    file,
    width: image.width,
    height: image.height,
    gamut: image.gamut,
    profileDescription: image.profileDescription,
    quality: {
      ok: quality.ok,
      score: quality.score,
      issues: quality.issues.map((i) => ({ code: i.code, message: i.message })),
      metrics: quality.metrics
        ? (quality.metrics as unknown as Record<string, number | null>)
        : null,
    },
    regions: report,
    coverage: regionCoverage(regions),
    overlayPng: drawOverlay(imageLike, landmarks, segmentation),
  };
}

declare global {
  interface Window {
    __aura: { analyse: typeof analyse };
  }
}

window.__aura = { analyse };

// Silence the unused-import warning for discPixels, kept for ad-hoc probing.
void discPixels;


/** Diagnostic: how the diffuse band choice moves the skin reading. */
(globalThis as unknown as Record<string, unknown>).__bandSweepReady = true;
