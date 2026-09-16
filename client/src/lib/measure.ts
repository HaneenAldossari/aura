/**
 * Thin client wrapper over measure/.
 *
 * The heavy lifting lives in measure/ at the repo root, unchanged, because the
 * eval runs that same module in headless Chromium. Nothing here may contain
 * measurement logic — only wiring.
 */

import {
  prefetchModels,
  runMeasurement,
  type PipelineResult,
  type StageEvent,
} from "../../../measure/pipeline";
import type { QualityIssue } from "../../../measure/quality";
import type { HairStatus } from "./types";

export type { StageEvent, QualityIssue };
export type MeasureOutcome = PipelineResult;

/** Where the Vite build copies the @jsquash codec .wasm files. */
const WASM_BASE = "/wasm/";

let prefetched = false;

/**
 * Begin downloading both MediaPipe models.
 *
 * Called as the analysis page mounts, not when the user hits analyse: the URLs
 * are versioned and immutably cached, so this is a one-time 20 MB that overlaps
 * with choosing a photo instead of stacking on top of it.
 */
export function warmUpModels(): void {
  if (prefetched) return;
  prefetched = true;
  prefetchModels();
}

/** Run the browser pipeline over a picked file. */
export async function measureFile(
  file: File,
  hairStatus: HairStatus,
  onStage: (event: StageEvent) => void
): Promise<MeasureOutcome> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return runMeasurement(bytes, { hairStatus, onStage, wasmBase: WASM_BASE });
}
