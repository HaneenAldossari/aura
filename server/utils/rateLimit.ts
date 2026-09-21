/**
 * Per-day limits on the three routes that cost money.
 *
 * The API is serverless, so an in-process counter counts nothing: every request
 * may land on a fresh instance. The count lives in Upstash Redis (free tier,
 * REST, no connection to hold), through @upstash/ratelimit.
 *
 * PRIVACY. The key is `sha256(salt + ip)`, never the address. A raw IP in a
 * third-party store is personal data held for no reason; a salted hash still
 * counts a visitor and cannot be turned back into one without the salt, which
 * lives only in this deployment's environment. The hash is never logged either.
 * Without RATE_LIMIT_SALT the limiter refuses to run rather than fall back to
 * unsalted hashes, which a table of four billion addresses reverses in minutes.
 *
 * FAILURE. If Upstash is unreachable the request is allowed and the error is
 * logged. This limiter exists to cap cost, not to gate access; turning a Redis
 * outage into a total outage would be the worse trade. Not configured at all
 * (local dev, the eval, scripts) means not limited, and /api/health says so.
 *
 * Environment:
 *   UPSTASH_REDIS_REST_URL     from the Upstash console
 *   UPSTASH_REDIS_REST_TOKEN   from the Upstash console
 *   RATE_LIMIT_SALT            any long random string; `openssl rand -hex 32`
 *   RATE_LIMIT_BYPASS_TOKEN    optional; requests carrying it in `x-aura-bypass`
 *                              are not counted (the weekly e2e uses it)
 */
import { createHash, timingSafeEqual } from "crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { DAILY_LIMITS, LIMIT_HEADERS, type LimitKind } from "./limits";

export const BYPASS_HEADER = "x-aura-bypass";

const FRIENDLY: Record<LimitKind, string> = {
  chat: `You've used all ${DAILY_LIMITS.chat} of today's messages. They reset at midnight UTC — your results stay right here.`,
  analyze: `You've reached today's limit of ${DAILY_LIMITS.analyze} analyses. It resets at midnight UTC. The sample faces are always free to try.`,
  shop: `You've checked ${DAILY_LIMITS.shop} items today, which is the daily limit. It resets at midnight UTC.`,
};

export function rateLimitConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && process.env.RATE_LIMIT_SALT
  );
}

/** Why the limiter is off, for /api/health. Never a secret, only which name is missing. */
export function rateLimitStatus(): "enforced" | "disabled: not configured" | "disabled: RATE_LIMIT_SALT missing" {
  if (rateLimitConfigured()) return "enforced";
  const upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  return upstash ? "disabled: RATE_LIMIT_SALT missing" : "disabled: not configured";
}

/** First hop of x-forwarded-for: on Vercel the platform writes it, so a client cannot choose it. */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/** The only form of the address that leaves this function. */
export function visitorKey(request: Request, salt: string): string {
  return createHash("sha256").update(`${salt}:${clientIp(request)}`).digest("hex").slice(0, 32);
}

function bypassed(request: Request): boolean {
  const expected = process.env.RATE_LIMIT_BYPASS_TOKEN;
  const given = request.headers.get(BYPASS_HEADER);
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const limiters = new Map<LimitKind, Ratelimit>();
function limiterFor(kind: LimitKind): Ratelimit {
  let limiter = limiters.get(kind);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      // Fixed, not sliding: "today" is something a person can reason about,
      // and the browser's counter resets on the same UTC boundary.
      limiter: Ratelimit.fixedWindow(DAILY_LIMITS[kind], "1 d"),
      prefix: `aura:limit:${kind}`,
      analytics: false,
    });
    limiters.set(kind, limiter);
  }
  return limiter;
}

export interface LimitOutcome {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms at which the window resets. */
  reset: number;
}

/** Injectable for tests; the default talks to Upstash. */
export type LimitCheck = (kind: LimitKind, key: string) => Promise<LimitOutcome>;

const upstashCheck: LimitCheck = async (kind, key) => {
  const r = await limiterFor(kind).limit(key);
  return { allowed: r.success, limit: r.limit, remaining: Math.max(0, r.remaining), reset: r.reset };
};

function withLimitHeaders(response: Response, outcome: LimitOutcome): Response {
  const headers = new Headers(response.headers);
  headers.set(LIMIT_HEADERS.limit, String(outcome.limit));
  headers.set(LIMIT_HEADERS.remaining, String(outcome.remaining));
  headers.set(LIMIT_HEADERS.reset, String(Math.ceil(outcome.reset / 1000)));
  // The body is passed through untouched, so a streamed chat still streams.
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

type Handler = (request: Request) => Promise<Response>;

/**
 * Wrap a route in its daily limit.
 *
 * Applied where routes are mounted (api/*.ts and server/index.ts), not inside
 * the handlers, so scripts that call a handler directly — the eval, diagnose,
 * the demo precompute — are never counted against anybody.
 */
export function withDailyLimit(kind: LimitKind, handler: Handler, check: LimitCheck = upstashCheck): Handler {
  return async (request) => {
    // Only the calls that cost money: a preflight or a wrong method is free.
    if (request.method !== "POST" || !rateLimitConfigured() || bypassed(request)) return handler(request);

    let outcome: LimitOutcome;
    try {
      outcome = await check(kind, visitorKey(request, process.env.RATE_LIMIT_SALT!));
    } catch (err) {
      console.error(`[limit] ${kind}: store unreachable, allowing the request —`, err instanceof Error ? err.message : err);
      return handler(request);
    }

    if (!outcome.allowed) {
      const blocked = new Response(
        JSON.stringify({
          error: "daily_limit",
          kind,
          message: FRIENDLY[kind],
          limit: outcome.limit,
          remaining: 0,
          resetsAt: new Date(outcome.reset).toISOString(),
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": String(Math.max(1, Math.ceil((outcome.reset - Date.now()) / 1000))),
          },
        }
      );
      return withLimitHeaders(blocked, { ...outcome, remaining: 0 });
    }

    return withLimitHeaders(await handler(request), outcome);
  };
}
