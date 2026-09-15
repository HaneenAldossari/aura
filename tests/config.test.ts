import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MODELS,
  EVAL_MODELS,
  analysisMode,
  classifyReasoningEnabled,
  fallbackModel,
  maxFileSizeBytes,
  modelChat,
  modelClassify,
  modelShop,
} from "../server/utils/config";

const MODEL_VARS = [
  "MODEL_CLASSIFY",
  "MODEL_CHAT",
  "MODEL_SHOP",
  "OPENROUTER_MODEL",
  "OPENROUTER_CHAT_MODEL",
  "OPENROUTER_FALLBACK_MODEL",
  "ANALYSIS_MODE",
  "CLASSIFY_REASONING",
  "MAX_FILE_SIZE",
];

afterEach(() => {
  for (const v of MODEL_VARS) delete process.env[v];
  vi.restoreAllMocks();
});

describe("model selection", () => {
  it("defaults every task to a paid vision model", () => {
    expect(modelClassify()).toBe("google/gemini-3.8-flash");
    expect(modelChat()).toBe("google/gemini-3.8-flash");
    expect(modelShop()).toBe("google/gemini-3.8-flash");
  });

  it("never defaults to a withdrawn free model", () => {
    // Both of these returned HTTP 404 from OpenRouter and are why Phase 0 exists.
    const withdrawn = [
      "nvidia/nemotron-nano-12b-v2-vl:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
    ];
    for (const model of Object.values(DEFAULT_MODELS)) {
      expect(withdrawn).not.toContain(model);
      expect(model.endsWith(":free")).toBe(false);
    }
  });

  it("MODEL_* overrides the default, per task", () => {
    process.env.MODEL_CLASSIFY = "vendor/classify";
    process.env.MODEL_CHAT = "vendor/chat";
    process.env.MODEL_SHOP = "vendor/shop";
    expect(modelClassify()).toBe("vendor/classify");
    expect(modelChat()).toBe("vendor/chat");
    expect(modelShop()).toBe("vendor/shop");
  });

  it("honors the deprecated vars so a stale deployment keeps working", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.OPENROUTER_MODEL = "legacy/classify";
    process.env.OPENROUTER_CHAT_MODEL = "legacy/chat";
    expect(modelClassify()).toBe("legacy/classify");
    expect(modelChat()).toBe("legacy/chat");
    expect(warn).toHaveBeenCalled();
  });

  it("prefers MODEL_* over the deprecated var when both are set", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.OPENROUTER_MODEL = "legacy/classify";
    process.env.MODEL_CLASSIFY = "new/classify";
    expect(modelClassify()).toBe("new/classify");
  });

  it("ignores blank env values", () => {
    process.env.MODEL_CLASSIFY = "   ";
    expect(modelClassify()).toBe(DEFAULT_MODELS.classify);
  });

  it("reports the fallback model only when configured", () => {
    expect(fallbackModel()).toBeUndefined();
    process.env.OPENROUTER_FALLBACK_MODEL = "vendor/backup";
    expect(fallbackModel()).toBe("vendor/backup");
  });
});

describe("pipeline flags", () => {
  it("defaults to llm_only and accepts hybrid", () => {
    expect(analysisMode()).toBe("llm_only");
    process.env.ANALYSIS_MODE = "hybrid";
    expect(analysisMode()).toBe("hybrid");
    process.env.ANALYSIS_MODE = "nonsense";
    expect(analysisMode()).toBe("llm_only");
  });

  it("keeps classification reasoning on unless explicitly disabled", () => {
    expect(classifyReasoningEnabled()).toBe(true);
    process.env.CLASSIFY_REASONING = "false";
    expect(classifyReasoningEnabled()).toBe(false);
  });
});

describe("eval comparators", () => {
  it("covers four vendors with priced entries", () => {
    const vendors = new Set(EVAL_MODELS.map((m) => m.id.split("/")[0]));
    expect(vendors).toEqual(new Set(["google", "anthropic", "openai"]));
    expect(EVAL_MODELS.length).toBeGreaterThanOrEqual(5);
    for (const m of EVAL_MODELS) {
      expect(m.promptUsd).toBeGreaterThan(0);
      expect(m.completionUsd).toBeGreaterThan(0);
    }
  });

  it("includes the production classify model so eval and prod are comparable", () => {
    expect(EVAL_MODELS.map((m) => m.id)).toContain(DEFAULT_MODELS.classify);
  });
});

describe("maxFileSizeBytes", () => {
  it("parses units and falls back to 10MB", () => {
    expect(maxFileSizeBytes()).toBe(10 * 1024 * 1024);
    process.env.MAX_FILE_SIZE = "5mb";
    expect(maxFileSizeBytes()).toBe(5 * 1024 * 1024);
    process.env.MAX_FILE_SIZE = "500kb";
    expect(maxFileSizeBytes()).toBe(500 * 1024);
    process.env.MAX_FILE_SIZE = "banana";
    expect(maxFileSizeBytes()).toBe(10 * 1024 * 1024);
  });
});
