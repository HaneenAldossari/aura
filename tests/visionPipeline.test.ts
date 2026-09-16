/**
 * End-to-end wiring for the classification path, with the provider stubbed.
 *
 * The live model was verified separately: google/gemini-3.8-flash returns
 * schema-valid, fence-free JSON for a real face through OpenRouter's
 * response_format: json_schema. What this file proves is the code around it —
 * that the schema is actually sent, the photo gate is translated, and the
 * result survives normalizeResult into something the results page can render.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyzePhotos } from "../server/services/vision";
import { normalizeResult } from "../server/normalizeResult";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";

const MODEL_REPLY = {
  photoIssue: null,
  photoTips: [],
  assessment: {
    undertone: "warm",
    depth: "deep",
    chroma: "muted",
    contrast: "high",
    evidence: "Golden-bronze skin, espresso hair, warm amber eyes.",
  },
  primarySeason: "Deep Autumn",
  secondarySeason: "True Autumn",
  confidence: 0.86,
  axes: { hue: "warm", value: "dark", chroma: "medium" },
  observations: {
    skin: "Deep golden bronze",
    hair: "Espresso brown",
    eyes: "Warm amber-brown",
    contrast: "High",
  },
  rationale: "Depth plus warmth plus muting lands on Deep Autumn.",
  seasonTagline: "Burnished warmth",
  seasonStory: "Rich, earthy, saturated colors are yours.",
  koreanTone: "딥톤 (Deep Tone)",
  colorDNA: { warmth: 80, depth: 85, clarity: 45, contrast: 75 },
  makeup: {
    foundationTip: "Golden-toned base.",
    blush: "terracotta",
    bronzer: "warm bronze",
    lips: "brick, rust",
    eyes: "copper, olive",
  },
  jewelryStyle: "Warm, textured, antique gold",
  hairColor: {
    bestOverall: "Deep chestnut",
    bestHighlights: "Warm caramel",
    avoid: "Ash blonde",
  },
  celebrities: [{ name: "Test Person", why: "Same warm depth" }],
};

let fetchMock: ReturnType<typeof vi.fn>;

function reply(payload: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const photo = [{ base64: "AAAA", mimeType: "image/jpeg" }];

describe("analyzePhotos", () => {
  it("sends the strict schema and the image to the classify model", async () => {
    fetchMock.mockResolvedValueOnce(reply(MODEL_REPLY));
    await analyzePhotos(photo);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("google/gemini-3.8-flash");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.properties.primarySeason.enum).toEqual([
      ...CANONICAL_SEASONS,
    ]);
    // Determinism: same photo, same season.
    expect(body.temperature).toBe(0);
    expect(body.seed).toBe(12);

    const blocks = body.messages.at(-1).content;
    expect(blocks.some((b: any) => b.type === "image_url")).toBe(true);
  });

  it("translates photoIssue into the error contract the client already handles", async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ ...MODEL_REPLY, photoIssue: "no_face", photoTips: ["Face the window"] })
    );
    const result = await analyzePhotos(photo);

    expect(result.error).toBe("no_face");
    expect(result.message).toContain("face");
    expect(result.photoTips).toEqual(["Face the window"]);
    // photoIssue is an internal name; it must not leak into the response.
    expect(result).not.toHaveProperty("photoIssue");
  });

  it("leaves a clean analysis with no error field", async () => {
    fetchMock.mockResolvedValueOnce(reply(MODEL_REPLY));
    const result = await analyzePhotos(photo);
    expect(result.error).toBeUndefined();
    expect(result.primarySeason).toBe("Deep Autumn");
  });

  it("retries once before giving up", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers(),
      text: async () => "boom",
      json: async () => ({}),
    } as unknown as Response);
    fetchMock.mockResolvedValueOnce(reply(MODEL_REPLY));

    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await analyzePhotos(photo);
    expect(result.primarySeason).toBe("Deep Autumn");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("analyzePhotos → normalizeResult", () => {
  it("produces a result the results page can render", async () => {
    fetchMock.mockResolvedValueOnce(reply(MODEL_REPLY));
    const result = normalizeResult(await analyzePhotos(photo));

    expect(result.season).toBe("Deep Autumn");
    expect(result.confidence).toBe(86);
    expect(result.undertone).toBe("warm");

    // The two reads that are NOT optional-chained in the client.
    const palette = result.palette as Record<string, any>;
    expect(Array.isArray(palette.best)).toBe(true);
    expect(Array.isArray(palette.avoid)).toBe(true);
    expect(palette.metals.best.length).toBeGreaterThan(0);

    // Canonical palette wins; the model supplies no hexes at all now.
    expect(palette.best.every((c: any) => /^#[0-9A-Fa-f]{6}$/.test(c.hex))).toBe(true);

    expect((result.hairColor as any).bestOverall).toBe("Deep chestnut");
    expect((result.jewelry as any).style).toContain("gold");
    expect(result.axes).toEqual(MODEL_REPLY.axes);
  });
});
