import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callOpenRouter, callOpenRouterJSON } from "../server/services/openrouter";

function ok(content: string) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  } as unknown as Response;
}

function fail(status: number, body = "boom") {
  return {
    ok: false,
    status,
    headers: new Headers(),
    json: async () => ({}),
    text: async () => body,
  } as unknown as Response;
}

/** Model IDs seen by each fetch call, in order. */
function modelsFrom(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map(
    (call) => JSON.parse((call[1] as RequestInit).body as string).model
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  process.env.MODEL_CLASSIFY = "primary/model";
  vi.spyOn(console, "warn").mockImplementation(() => {});
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.MODEL_CLASSIFY;
  delete process.env.OPENROUTER_FALLBACK_MODEL;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("OPENROUTER_FALLBACK_MODEL", () => {
  it("engages when the primary model call fails", async () => {
    process.env.OPENROUTER_FALLBACK_MODEL = "backup/model";
    fetchMock.mockResolvedValueOnce(fail(404, "No endpoints found"));
    fetchMock.mockResolvedValueOnce(ok("recovered"));

    await expect(callOpenRouter([{ role: "user", content: "hi" }])).resolves.toBe(
      "recovered"
    );
    expect(modelsFrom(fetchMock)).toEqual(["primary/model", "backup/model"]);
  });

  /**
   * The bug this replaces: the fallback was only attached when the caller
   * passed no explicit model, so once every call site named its own model the
   * fallback silently stopped existing.
   */
  it("engages even when the caller passes an explicit model", async () => {
    process.env.OPENROUTER_FALLBACK_MODEL = "backup/model";
    fetchMock.mockResolvedValueOnce(fail(500));
    fetchMock.mockResolvedValueOnce(ok("recovered"));

    await expect(
      callOpenRouter([{ role: "user", content: "hi" }], { model: "explicit/model" })
    ).resolves.toBe("recovered");
    expect(modelsFrom(fetchMock)).toEqual(["explicit/model", "backup/model"]);
  });

  it("throws the original error when no fallback is configured", async () => {
    fetchMock.mockResolvedValueOnce(fail(404, "No endpoints found"));
    await expect(callOpenRouter([{ role: "user", content: "hi" }])).rejects.toThrow(
      /404/
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry when the fallback is the same model", async () => {
    process.env.OPENROUTER_FALLBACK_MODEL = "primary/model";
    fetchMock.mockResolvedValueOnce(fail(500));
    await expect(callOpenRouter([{ role: "user", content: "hi" }])).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the fallback's own failure when both fail", async () => {
    process.env.OPENROUTER_FALLBACK_MODEL = "backup/model";
    fetchMock.mockResolvedValueOnce(fail(500, "primary down"));
    fetchMock.mockResolvedValueOnce(fail(502, "backup down"));
    await expect(callOpenRouter([{ role: "user", content: "hi" }])).rejects.toThrow(
      /backup down/
    );
  });

  it("retries a 429 on the same model before falling back", async () => {
    const headers = new Headers({ "retry-after": "1" });
    fetchMock.mockResolvedValueOnce({ ...fail(429), headers } as unknown as Response);
    fetchMock.mockResolvedValueOnce(ok("second try"));

    // The retry sleeps for real, so drive the clock rather than waiting on it.
    vi.useFakeTimers();
    try {
      const pending = callOpenRouter([{ role: "user", content: "hi" }]);
      await vi.advanceTimersByTimeAsync(1000);
      await expect(pending).resolves.toBe("second try");
    } finally {
      vi.useRealTimers();
    }
    expect(modelsFrom(fetchMock)).toEqual(["primary/model", "primary/model"]);
  });
});

describe("callOpenRouterJSON", () => {
  it("sends a strict json_schema response_format", async () => {
    fetchMock.mockResolvedValueOnce(ok('{"season":"Deep Winter"}'));
    await callOpenRouterJSON(
      [{ role: "user", content: "hi" }],
      { name: "s", schema: { type: "object" } }
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.name).toBe("s");
  });

  it("still parses fenced output, so a model ignoring the schema is not fatal", async () => {
    fetchMock.mockResolvedValueOnce(ok('```json\n{"season":"Soft Summer"}\n```'));
    const parsed = await callOpenRouterJSON<{ season: string }>(
      [{ role: "user", content: "hi" }],
      { name: "s", schema: { type: "object" } }
    );
    expect(parsed.season).toBe("Soft Summer");
  });
});
