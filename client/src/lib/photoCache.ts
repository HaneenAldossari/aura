/**
 * The analysed photo, kept for the life of the tab and no longer.
 *
 * "Change hair answer" re-runs the analysis against the same pixels instead of
 * asking for the photo again — the hair answer changes which regions are
 * scored, not what was photographed, so a re-upload would be asking the user to
 * fix something that is not broken.
 *
 * Deliberately a module variable and not localStorage. Rule 4 of this codebase
 * is that image bytes never touch disk, and localStorage is disk; a photo
 * written there would outlive the tab, the session and the user's memory of
 * having uploaded it. The cost is that the button cannot work after a reload,
 * which the caller handles by hiding it.
 */

import type { HairStatus } from "./types";

interface CachedPhoto {
  bytes: Uint8Array;
  hairStatus: HairStatus;
  /** The result id this photo produced, so a stale cache is never reused. */
  resultId: string;
}

let cached: CachedPhoto | null = null;

export function cachePhoto(resultId: string, bytes: Uint8Array, hairStatus: HairStatus): void {
  cached = { resultId, bytes, hairStatus };
}

/**
 * Carry the cached photo forward to a new result id.
 *
 * A second photo produces a new analysis, and the first photo has to survive
 * that — otherwise "change hair answer" stops working the moment someone adds
 * a second photo, which is the opposite of the intended direction of travel.
 */
export function rekeyCachedPhoto(fromId: string | undefined, toId: string): void {
  if (!cached || !fromId || cached.resultId !== fromId) return;
  cached = { ...cached, resultId: toId };
}

/** The cached photo, but only if it is the one behind `resultId`. */
export function getCachedPhoto(resultId: string | undefined): CachedPhoto | null {
  if (!resultId || !cached || cached.resultId !== resultId) return null;
  return cached;
}

export function clearCachedPhoto(): void {
  cached = null;
}
