/**
 * The last shop check, for the life of the tab.
 *
 * People switch to Overview to look at their palette and come straight back;
 * losing the result they just spent a call on is the quickest way to make
 * someone stop using a tab. In memory only, like the photo cache — the preview
 * is an object URL that would not survive a reload anyway.
 */

import type { LinkCheckResultData } from "./types";

interface Remembered {
  resultId: string;
  result: LinkCheckResultData;
  preview: string | null;
}

let last: Remembered | null = null;

export function rememberCheck(
  resultId: string | undefined,
  result: LinkCheckResultData | null,
  preview: string | null
): void {
  if (!resultId || !result) {
    if (last?.preview) URL.revokeObjectURL(last.preview);
    last = null;
    return;
  }
  if (last?.preview && last.preview !== preview) URL.revokeObjectURL(last.preview);
  last = { resultId, result, preview };
}

/** The remembered check, but only if it belongs to this analysis. */
export function getLastCheck(
  resultId: string | undefined
): { result: LinkCheckResultData; preview: string | null } | null {
  if (!resultId || !last || last.resultId !== resultId) return null;
  return { result: last.result, preview: last.preview };
}
