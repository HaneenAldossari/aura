/**
 * In-memory session store with TTL + size cap. Replaces the previous
 * unbounded module-level object. Sessions are ephemeral by design —
 * results live for SESSION_TTL_HOURS (default 24) or until the process
 * restarts (Render free tier recycles instances).
 */

interface Entry {
  result: Record<string, unknown>;
  expiresAt: number;
}

const TTL_MS =
  (Number(process.env.SESSION_TTL_HOURS) || 24) * 60 * 60 * 1000;
const MAX_SESSIONS = 500;
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

const store = new Map<string, Entry>();

function sweep(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}

// unref() so the sweeper never keeps the process alive
setInterval(sweep, SWEEP_INTERVAL_MS).unref();

export const sessions = {
  get(id: string): Record<string, unknown> | undefined {
    const entry = store.get(id);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      store.delete(id);
      return undefined;
    }
    return entry.result;
  },

  set(id: string, result: Record<string, unknown>): void {
    // Evict oldest entries when at capacity (Map preserves insertion order)
    while (store.size >= MAX_SESSIONS) {
      const oldest = store.keys().next().value;
      if (oldest === undefined) break;
      store.delete(oldest);
    }
    store.set(id, { result, expiresAt: Date.now() + TTL_MS });
  },

  get size(): number {
    sweep();
    return store.size;
  },
};
