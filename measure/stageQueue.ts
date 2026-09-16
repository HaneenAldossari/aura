/**
 * Minimum dwell for loading-stage labels.
 *
 * Stages are driven by real pipeline events, and some of them complete
 * instantly — a cached model resolves in a few milliseconds. Rendering those
 * faithfully makes the labels flash past unreadably, which looks like a glitch
 * rather than progress.
 *
 * So: real timing, with a floor. A stage that takes longer than the floor is
 * shown for exactly as long as it takes; one that finishes sooner is held until
 * the floor elapses. Nothing is ever shown for less than the floor, and nothing
 * is ever stretched beyond its real duration.
 *
 * Pure apart from the clock, which is injected, so this is testable without a
 * browser or fake timers.
 */

export const DEFAULT_MIN_STAGE_MS = 600;

export interface StageQueueOptions<T> {
  /** Milliseconds a stage must remain visible before the next one replaces it. */
  minMs?: number;
  /** Called when the visible stage changes. */
  onChange: (stage: T) => void;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => void;
}

export interface StageQueue<T> {
  /** Report the stage that is actually running now. */
  push(stage: T): void;
  /** Stop delivering. Any queued stage is dropped. */
  stop(): void;
}

/**
 * Queue stage changes so each is visible for at least `minMs`.
 *
 * Only the most recent pending stage is kept: if three stages complete inside
 * one dwell window, the user sees the first and then the last, never a backlog
 * replayed in slow motion after the work has finished.
 */
export function createStageQueue<T>(options: StageQueueOptions<T>): StageQueue<T> {
  const minMs = options.minMs ?? DEFAULT_MIN_STAGE_MS;
  const now = options.now ?? (() => Date.now());
  const schedule =
    options.schedule ?? ((fn: () => void, ms: number) => void setTimeout(fn, ms));

  let shownAt: number | null = null;
  let pending: { stage: T } | null = null;
  let timerArmed = false;
  let stopped = false;

  const show = (stage: T) => {
    shownAt = now();
    options.onChange(stage);
  };

  const flush = () => {
    timerArmed = false;
    if (stopped || !pending) return;
    const next = pending.stage;
    pending = null;
    show(next);
    // Another stage may have arrived while this one was waiting.
    if (pending) arm();
  };

  const arm = () => {
    if (timerArmed || stopped) return;
    timerArmed = true;
    const elapsed = shownAt === null ? minMs : now() - shownAt;
    schedule(flush, Math.max(0, minMs - elapsed));
  };

  return {
    push(stage: T) {
      if (stopped) return;
      if (shownAt === null) {
        show(stage);
        return;
      }
      if (now() - shownAt >= minMs && !timerArmed) {
        show(stage);
        return;
      }
      // Replace rather than append: a backlog replayed after the work is done
      // is worse than skipping straight to where we actually are.
      pending = { stage };
      arm();
    },
    stop() {
      stopped = true;
      pending = null;
    },
  };
}
