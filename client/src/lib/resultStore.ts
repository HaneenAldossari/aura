/**
 * Where the analysis lives now that the API is stateless.
 *
 * There is no session store on the server: `/api/analyze` returns everything
 * (about 6 KB) and the browser keeps it. The URL still carries an id so a
 * results page can be reloaded and the back button works, but that id is a
 * local key, not a server handle — the result is never fetched back.
 *
 * localStorage rather than sessionStorage so a reload or a reopened tab still
 * works. It can throw or return nothing — private mode, cleared site data, a
 * quota — so every access is guarded and the caller gets null rather than an
 * exception.
 */

import type { AnalysisResult } from "./types";

const PREFIX = "aura-result:";
/** Keep the last few analyses, so going back to an earlier one still works. */
const MAX_STORED = 5;

function safeLocalStorage(): Storage | null {
  try {
    const probe = "__aura_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** In-memory fallback for the current page life, when storage is unavailable. */
const memory = new Map<string, AnalysisResult>();

export function newResultId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveResult(id: string, result: AnalysisResult): void {
  memory.set(id, result);
  const store = safeLocalStorage();
  if (!store) return;
  try {
    store.setItem(`${PREFIX}${id}`, JSON.stringify(result));
    prune(store);
  } catch {
    // Quota, most likely. The in-memory copy still serves this page load.
  }
}

export function loadResult(id: string): AnalysisResult | null {
  const inMemory = memory.get(id);
  if (inMemory) return inMemory;

  const store = safeLocalStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(`${PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisResult;
    memory.set(id, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function clearResult(id: string): void {
  memory.delete(id);
  safeLocalStorage()?.removeItem(`${PREFIX}${id}`);
}

/** Drop the oldest entries beyond MAX_STORED. Keys are insertion-ordered enough. */
function prune(store: Storage): void {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  if (keys.length <= MAX_STORED) return;
  for (const key of keys.slice(0, keys.length - MAX_STORED)) {
    try {
      store.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
