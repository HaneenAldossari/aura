/**
 * Daily limits, per visitor.
 *
 * Constants, not environment variables, and in a file with no imports: the
 * server enforces them and the browser's "N of 15 messages left today" counter
 * reads the same numbers, so the two cannot drift. An env override on the
 * server alone would make the counter lie.
 *
 * Why these numbers: an analysis costs about $0.01, a shop check about $0.003,
 * a chat message a fraction of a cent. Five, ten and fifteen a day is far more
 * than one person deciding on a jumper needs, and caps a single abusive visitor
 * at roughly ten cents a day.
 */
export const DAILY_LIMITS = {
  chat: 15,
  analyze: 5,
  shop: 10,
} as const;

export type LimitKind = keyof typeof DAILY_LIMITS;

/** The window is the UTC calendar day, on both sides. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Response headers the server sets and the browser counter reads. */
export const LIMIT_HEADERS = {
  limit: "x-ratelimit-limit",
  remaining: "x-ratelimit-remaining",
  reset: "x-ratelimit-reset",
} as const;
