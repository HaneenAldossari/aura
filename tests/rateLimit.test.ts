/**
 * Daily limits: 15 chat messages, 5 analyses, 10 shop checks.
 *
 * Counted server-side in Upstash Redis, keyed on a salted hash of the address.
 * These run the real wrapper against an in-memory stand-in for Redis, so they
 * test everything except Upstash itself: the numbers, the key, the 429, the
 * headers, the bypass, fail-open, and that an unconfigured deployment (local
 * dev, the eval, every script) is simply not limited.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { DAILY_LIMITS, LIMIT_HEADERS, utcDay, type LimitKind } from "../server/utils/limits";
import {
  BYPASS_HEADER,
  rateLimitConfigured,
  rateLimitStatus,
  visitorKey,
  withDailyLimit,
  type LimitCheck,
} from "../server/utils/rateLimit";

const ENV = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "RATE_LIMIT_SALT", "RATE_LIMIT_BYPASS_TOKEN"] as const;
const saved: Record<string, string | undefined> = {};

function configure() {
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  process.env.RATE_LIMIT_SALT = "a-long-random-salt";
}

beforeEach(() => { for (const k of ENV) { saved[k] = process.env[k]; delete process.env[k]; } });
afterEach(() => { for (const k of ENV) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

/** Redis, for the purposes of this file: a fixed window per (kind, key). */
function fakeStore(): { check: LimitCheck; keys: Set<string> } {
  const counts = new Map<string, number>();
  const keys = new Set<string>();
  return {
    keys,
    check: async (kind, key) => {
      keys.add(key);
      const id = `${kind}:${key}`;
      const used = (counts.get(id) ?? 0) + 1;
      counts.set(id, used);
      const limit = DAILY_LIMITS[kind];
      return { allowed: used <= limit, limit, remaining: Math.max(0, limit - used), reset: Date.now() + 3_600_000 };
    },
  };
}

const post = (ip: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", { method: "POST", headers: { "x-forwarded-for": ip, ...headers } });
const ok = async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });

describe("the numbers", () => {
  it("are 15 chat messages, 5 analyses and 10 shop checks a day", () => {
    expect(DAILY_LIMITS).toEqual({ chat: 15, analyze: 5, shop: 10 });
  });

  it("are shared with the browser counter rather than copied into it", () => {
    // Code only: the doc comment quotes "12 of 15 messages left today" as its example.
    const counter = fs
      .readFileSync(path.join(__dirname, "../client/src/lib/dailyCounter.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(counter).toMatch(/from "\.\.\/\.\.\/\.\.\/server\/utils\/limits"/);
    expect(counter).not.toMatch(/\b15\b|\b10\b/);
    // No imports of its own, so bundling it into the client costs nothing and drags nothing in.
    expect(fs.readFileSync(path.join(__dirname, "../server/utils/limits.ts"), "utf8")).not.toMatch(/^import /m);
  });

  it("use the UTC day on both sides", () => {
    expect(utcDay(new Date("2026-09-21T23:59:59Z"))).toBe("2026-09-21");
    expect(utcDay(new Date("2026-09-22T00:00:00Z"))).toBe("2026-09-22");
  });
});

describe.each(Object.entries(DAILY_LIMITS) as [LimitKind, number][])("%s: %i a day", (kind, limit) => {
  it("allows exactly that many, counts down in the headers, then answers 429", async () => {
    configure();
    const store = fakeStore();
    const route = withDailyLimit(kind, ok, store.check);

    for (let i = 1; i <= limit; i++) {
      const res = await route(post("203.0.113.7"));
      expect(res.status, `request ${i}`).toBe(200);
      expect(res.headers.get(LIMIT_HEADERS.remaining)).toBe(String(limit - i));
      expect(res.headers.get(LIMIT_HEADERS.limit)).toBe(String(limit));
    }

    const blocked = await route(post("203.0.113.7"));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body).toMatchObject({ error: "daily_limit", kind, limit, remaining: 0 });
    expect(body.message).toMatch(new RegExp(`\\b${limit}\\b`));
    expect(body.message).toMatch(/midnight UTC/);
    expect(body.message).not.toMatch(/error|denied|forbidden|exceeded/i);
    expect(new Date(body.resetsAt).getTime()).toBeGreaterThan(Date.now());
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("counts each visitor separately", async () => {
    configure();
    const route = withDailyLimit(kind, ok, fakeStore().check);
    for (let i = 0; i < limit; i++) await route(post("203.0.113.7"));
    expect((await route(post("203.0.113.7"))).status).toBe(429);
    expect((await route(post("198.51.100.9"))).status).toBe(200);
  });
});

describe("the key is a salted hash, never the address", () => {
  it("contains no trace of the IP and nothing but hex", async () => {
    configure();
    const store = fakeStore();
    await withDailyLimit("chat", ok, store.check)(post("203.0.113.7"));
    const [key] = [...store.keys];
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(key).not.toContain("203");
  });

  it("is stable for one visitor and different under a different salt", () => {
    const a = visitorKey(post("203.0.113.7"), "salt-one");
    expect(visitorKey(post("203.0.113.7"), "salt-one")).toBe(a);
    expect(visitorKey(post("203.0.113.7"), "salt-two")).not.toBe(a);
    expect(visitorKey(post("203.0.113.8"), "salt-one")).not.toBe(a);
  });

  it("takes the first hop of x-forwarded-for, which the platform writes", () => {
    const direct = visitorKey(post("203.0.113.7"), "s");
    expect(visitorKey(post("203.0.113.7, 10.0.0.1, 10.0.0.2"), "s")).toBe(direct);
  });

  it("refuses to run without a salt rather than hash unsalted", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(rateLimitConfigured()).toBe(false);
    expect(rateLimitStatus()).toBe("disabled: RATE_LIMIT_SALT missing");
  });

  it("never logs the key or the address", () => {
    const src = fs.readFileSync(path.join(__dirname, "../server/utils/rateLimit.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const line of src.split("\n").filter((l) => /console\./.test(l))) {
      expect(line).not.toMatch(/visitorKey|clientIp|key\b/);
    }
  });
});

describe("when it must not get in the way", () => {
  it("is off when not configured, so local dev and scripts are never limited", async () => {
    expect(rateLimitStatus()).toBe("disabled: not configured");
    const store = fakeStore();
    const route = withDailyLimit("analyze", ok, store.check);
    for (let i = 0; i < 20; i++) expect((await route(post("203.0.113.7"))).status).toBe(200);
    expect(store.keys.size).toBe(0);
  });

  it("fails open if the store is unreachable", async () => {
    configure();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = withDailyLimit("analyze", ok, async () => { throw new Error("ECONNRESET"); });
    expect((await route(post("203.0.113.7"))).status).toBe(200);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("does not count a bypass token, and ignores a wrong one", async () => {
    configure();
    process.env.RATE_LIMIT_BYPASS_TOKEN = "monitor-secret";
    const store = fakeStore();
    const route = withDailyLimit("analyze", ok, store.check);
    for (let i = 0; i < 12; i++) expect((await route(post("203.0.113.7", { [BYPASS_HEADER]: "monitor-secret" }))).status).toBe(200);
    expect(store.keys.size).toBe(0);
    for (let i = 0; i < DAILY_LIMITS.analyze; i++) await route(post("203.0.113.7", { [BYPASS_HEADER]: "guess" }));
    expect((await route(post("203.0.113.7", { [BYPASS_HEADER]: "guess" }))).status).toBe(429);
  });

  it("only counts POSTs, and passes a streamed body through untouched", async () => {
    configure();
    const store = fakeStore();
    const stream = async () => new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("data: hi\n\n")); c.close(); } }), { headers: { "content-type": "text/event-stream" } });
    const route = withDailyLimit("chat", stream, store.check);
    await route(new Request("http://localhost/api/chat", { method: "GET" }));
    expect(store.keys.size).toBe(0);
    const res = await route(post("203.0.113.7"));
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(await res.text()).toBe("data: hi\n\n");
    expect(res.headers.get(LIMIT_HEADERS.remaining)).toBe("14");
  });
});

describe("where it is mounted", () => {
  it.each([
    ["api/analyze.ts", "analyze"], ["api/chat.ts", "chat"],
    ["api/link-check-image.ts", "shop"], ["api/link-check-manual.ts", "shop"],
  ])("%s is wrapped as %s", (file, kind) => {
    expect(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).toContain(`withDailyLimit("${kind}",`);
  });

  it("the free routes are not limited, and neither are the handlers scripts call directly", () => {
    for (const file of ["api/health.ts", "api/demo-list.ts", "api/demo-load.ts"]) {
      expect(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).not.toContain("withDailyLimit");
    }
    for (const file of ["server/handlers/analyze.ts", "server/handlers/chat.ts", "server/handlers/tools.ts"]) {
      expect(fs.readFileSync(path.join(__dirname, "..", file), "utf8")).not.toContain("withDailyLimit");
    }
  });

  it("the chat shows what is left, from the matching counter", () => {
    const chat = fs.readFileSync(path.join(__dirname, "../client/src/pages/results/ChatWidget.tsx"), "utf8");
    expect(chat).toMatch(/remainingToday\("chat"\)/);
    expect(chat).toMatch(/results\.chat\.leftToday/);
  });
});
