/**
 * The browser's copy of the daily limits.
 *
 * The server is the authority (server/utils/rateLimit.ts, counted in Redis by
 * a salted hash). This exists so the chat can say "12 of 15 messages left
 * today" before the reader hits a wall, without a request just to ask.
 *
 * It matches the server two ways: the limits are the same constants
 * (server/utils/limits.ts), and the window is the same UTC day. And whenever a
 * response carries `x-ratelimit-remaining`, that number replaces this one — so
 * a second device, cleared storage or a shared network are corrected on the
 * next call rather than trusted.
 *
 * localStorage can throw or be empty (private mode, blocked site data); then
 * the count lasts for the page and the server still has the real one.
 */
import { DAILY_LIMITS, LIMIT_HEADERS, utcDay, type LimitKind } from "../../../server/utils/limits";

const KEY = (kind: LimitKind) => `aura-daily:${kind}`;
const memory = new Map<LimitKind, { day: string; used: number }>();

function read(kind: LimitKind): { day: string; used: number } {
  const today = utcDay();
  let entry = memory.get(kind);
  try {
    const raw = window.localStorage.getItem(KEY(kind));
    if (raw) entry = JSON.parse(raw) as { day: string; used: number };
  } catch {
    /* fall back to the in-memory copy */
  }
  // A new UTC day is a new allowance.
  if (!entry || entry.day !== today || !Number.isFinite(entry.used)) return { day: today, used: 0 };
  return entry;
}

function write(kind: LimitKind, used: number): void {
  const entry = { day: utcDay(), used: Math.max(0, Math.min(DAILY_LIMITS[kind], used)) };
  memory.set(kind, entry);
  try {
    window.localStorage.setItem(KEY(kind), JSON.stringify(entry));
  } catch {
    /* the in-memory copy serves this page */
  }
}

export function dailyLimit(kind: LimitKind): number {
  return DAILY_LIMITS[kind];
}

export function remainingToday(kind: LimitKind): number {
  return Math.max(0, DAILY_LIMITS[kind] - read(kind).used);
}

/** Count one use locally. Call when a request is sent. */
export function recordUse(kind: LimitKind): number {
  write(kind, read(kind).used + 1);
  return remainingToday(kind);
}

/** Take the server's number when it sends one; it is the authority. */
export function syncFromResponse(kind: LimitKind, response: Response): number {
  const header = response.headers.get(LIMIT_HEADERS.remaining);
  const remaining = header === null ? NaN : Number(header);
  if (Number.isFinite(remaining)) write(kind, DAILY_LIMITS[kind] - remaining);
  return remainingToday(kind);
}

/** A 429 from our own limiter, as opposed to the model provider being busy. */
export class DailyLimitError extends Error {
  readonly kind: LimitKind;
  constructor(kind: LimitKind, message: string) {
    super(message);
    this.name = "DailyLimitError";
    this.kind = kind;
  }
}
