/**
 * /api/health answers "can this deployment do its job?", not "is it up?".
 *
 * OpenRouter is mocked: the point is what health concludes from each answer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleHealth } from "../server/handlers/health";
import { resetAccountCache } from "../server/services/openrouter";
import { modelClassify } from "../server/utils/config";

const realFetch = globalThis.fetch;
const savedKey = process.env.OPENROUTER_API_KEY;
const savedAlert = process.env.OPENROUTER_BALANCE_ALERT_USD;

function mockOpenRouter(options: { listed?: string[] | "down"; credits?: { total_credits: number; total_usage: number } | "forbidden" }) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/models")) {
      if (options.listed === "down") throw new Error("ETIMEDOUT");
      return new Response(JSON.stringify({ data: (options.listed ?? []).map((id) => ({ id })) }));
    }
    if (url.endsWith("/credits")) {
      expect((init?.headers as Record<string, string>).authorization).toMatch(/^Bearer /);
      if (options.credits === "forbidden" || !options.credits) return new Response("{}", { status: 403 });
      return new Response(JSON.stringify({ data: options.credits }));
    }
    throw new Error(`unexpected fetch: ${url}`);
  }) as typeof fetch;
  return calls;
}

const health = async () => {
  const res = await handleHealth(new Request("http://localhost/api/health"));
  return { status: res.status, body: (await res.json()) as Record<string, any> };
};

beforeEach(() => {
  resetAccountCache();
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  delete process.env.OPENROUTER_BALANCE_ALERT_USD;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.OPENROUTER_API_KEY = savedKey;
  if (savedAlert === undefined) delete process.env.OPENROUTER_BALANCE_ALERT_USD; else process.env.OPENROUTER_BALANCE_ALERT_USD = savedAlert;
  vi.restoreAllMocks();
});

describe("/api/health", () => {
  it("is ok when the models resolve and there is credit", async () => {
    mockOpenRouter({ listed: [modelClassify(), "other/model"], credits: { total_credits: 25, total_usage: 4.37 } });
    const { status, body } = await health();
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.modelsResolve[modelClassify()]).toBe(true);
    expect(body.balance).toEqual({ usd: 20, alertBelowUsd: 5, low: false });
    expect(body.problems).toEqual([]);
    expect(JSON.stringify(body)).toContain('"status":"ok"'); // the keyword an uptime monitor looks for
  });

  it("is DOWN, with a 503, when a configured model is no longer listed", async () => {
    mockOpenRouter({ listed: ["some/other-model"], credits: { total_credits: 25, total_usage: 1 } });
    const { status, body } = await health();
    expect(status).toBe(503);
    expect(body.status).toBe("down");
    expect(body.problems.join(" ")).toContain(modelClassify());
  });

  it("is degraded, still 200, when the balance is under the threshold", async () => {
    mockOpenRouter({ listed: [modelClassify()], credits: { total_credits: 10, total_usage: 6.5 } });
    const { status, body } = await health();
    expect(status).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.balance.low).toBe(true);
    expect(body.warnings.join(" ")).toMatch(/balance is under \$5/);
  });

  it("takes the threshold from OPENROUTER_BALANCE_ALERT_USD", async () => {
    process.env.OPENROUTER_BALANCE_ALERT_USD = "2";
    mockOpenRouter({ listed: [modelClassify()], credits: { total_credits: 10, total_usage: 6.5 } });
    expect((await health()).body.status).toBe("ok");
  });

  it("never pages because OpenRouter's own endpoints blinked", async () => {
    mockOpenRouter({ listed: "down", credits: "forbidden" });
    const { status, body } = await health();
    expect(status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.modelsResolve[modelClassify()]).toBeNull();
    expect(body.balance).toMatchObject({ usd: null, low: null });
    expect(body.warnings.join(" ")).toMatch(/could not verify model IDs/);
  });

  it("treats an empty model list as no answer, not as every model retired", async () => {
    mockOpenRouter({ listed: [], credits: { total_credits: 25, total_usage: 1 } });
    expect((await health()).body.status).toBe("ok");
  });

  it("is down without a key, and does not ask for a balance it has no key for", async () => {
    process.env.OPENROUTER_API_KEY = "";
    const calls = mockOpenRouter({ listed: [modelClassify()] });
    const { status, body } = await health();
    expect(status).toBe(503);
    expect(body.problems).toContain("OPENROUTER_API_KEY is not set");
    expect(calls.some((u) => u.endsWith("/credits"))).toBe(false);
  });

  it("caches a complete answer, so a monitor polling every minute is not two calls a minute", async () => {
    const calls = mockOpenRouter({ listed: [modelClassify()], credits: { total_credits: 25, total_usage: 1 } });
    await health(); await health(); await health();
    expect(calls).toHaveLength(2);
  });

  it("reports the limiter, and leaks nothing", async () => {
    mockOpenRouter({ listed: [modelClassify()], credits: { total_credits: 25, total_usage: 1.234 } });
    const { body } = await health();
    expect(body.rateLimit).toMatch(/^(enforced|disabled)/);
    expect(body.stateless).toBe(true);
    const text = JSON.stringify(body);
    expect(text).not.toContain("sk-or-test");
    expect(text).not.toContain("23.77"); // rounded to the dollar
  });
});
