/**
 * The same photo yields the same season.
 *
 * Three layers, because "the same photo" goes through three things that could
 * each wobble:
 *
 *   1. score() — pure arithmetic on the measured features. Must be identical.
 *   2. The decision — the model may only choose among the rules' top three, and
 *      an answer outside them is overruled by the rules' primary. So whatever
 *      the model says, the final season is one of three neighbours, never the
 *      opposite corner of the system.
 *   3. The model itself, at temperature 0 with a fixed seed. That one needs the
 *      network and costs money, so it runs only when asked:
 *
 *        LIVE_DETERMINISM=1 npx vitest run tests/determinism.test.ts   (~$0.05)
 *
 *      `npm run diagnose -- photo.jpg --runs=5` does the same for any photo.
 */
import { describe, expect, it } from "vitest";
import path from "path";
import fs from "fs";
import { candidateSeasons, CANDIDATE_COUNT, computeAgreement, decideSeason, rankSeasons } from "../server/services/hybrid";
import { SEASONS } from "../measure/seasons.config";
import type { MeasuredFeatures } from "../measure/score";

const RUNS = 5;

/** sample-2, measured 2026-09-21 (scripts/diagnose.ts). The face that read as two opposite seasons. */
const NATURAL: MeasuredFeatures = {
  skin: { L: 68.3, C: 30.3, h: 59.6 },
  hair: { L: 4.2, C: 1.1, h: 90.0 },
  eyes: { L: 10.7, C: 9.1, h: 50.7 },
  hairStatus: "natural",
} as MeasuredFeatures;
const DYED: MeasuredFeatures = { ...NATURAL, hair: null, hairStatus: "dyed" } as MeasuredFeatures;

describe("the rules are deterministic", () => {
  it.each([["hair counted", NATURAL], ["hair excluded", DYED]])("%s: five rankings are one ranking", (_, features) => {
    const runs = Array.from({ length: RUNS }, () => rankSeasons(features));
    for (const run of runs) expect(run).toEqual(runs[0]);
    expect(new Set(runs.map((r) => candidateSeasons(r).join("|"))).size).toBe(1);
  });
});

describe("the model chooses only among the rules' top three", () => {
  const rules = rankSeasons(NATURAL);
  const candidates = candidateSeasons(rules);

  it("offers exactly three, all from the top of the ranking, with no order to anchor on", () => {
    expect(CANDIDATE_COUNT).toBe(3);
    expect(candidates).toHaveLength(3);
    expect([...candidates].sort()).toEqual(rules.ranked.slice(0, 3).map((r) => r.season).sort());
    expect(candidates).toEqual([...candidates].sort((a, b) => a.localeCompare(b)));
    expect(candidates).toContain(rules.primary);
  });

  it("keeps the model's answer when it is a candidate", () => {
    for (const season of candidates) {
      expect(decideSeason(rules, season)).toEqual({ season, source: "model", rejected: null });
      expect(decideSeason(rules, season.toUpperCase()).season).toBe(season);
    }
  });

  it("overrules anything else with the rules' primary, and caps confidence", () => {
    const outside = SEASONS.filter((s) => !candidates.includes(s));
    expect(outside).toHaveLength(9);
    for (const answer of [...outside, "Soft Spring", "", null, undefined, 42]) {
      const decision = decideSeason(rules, answer);
      expect(decision.season, String(answer)).toBe(rules.primary);
      expect(decision.source).toBe("rules");
    }
    // The handler scores agreement on what the model said, so the cap applies.
    expect(computeAgreement(rules, outside[0]).confidenceCap).toBeLessThan(1);
  });

  it("so five runs of a model that answers anything at all still land within three seasons", () => {
    // The worst model imaginable: a different season every run, all twelve.
    const finals = new Set(SEASONS.map((answer) => decideSeason(rules, answer).season));
    expect(finals.size).toBeLessThanOrEqual(3);
    for (const season of finals) expect(candidates).toContain(season);
  });

  it("the face that read Deep Autumn and then Light Spring can no longer read either by accident", () => {
    // Hair counted: Deep Autumn was the rules' fifth choice. It is not a candidate.
    expect(candidateSeasons(rankSeasons(NATURAL))).not.toContain("Deep Autumn");
    // The two hair answers are different measurements, and may honestly differ —
    // but each is pinned to its own three.
    expect(candidateSeasons(rankSeasons(DYED))).toContain("Light Spring");
  });
});

describe("the call is made deterministically, and the schema enforces the three", () => {
  const vision = fs.readFileSync(path.join(__dirname, "../server/services/vision.ts"), "utf8");
  const handler = fs.readFileSync(path.join(__dirname, "../server/handlers/analyze.ts"), "utf8");

  it("temperature 0, fixed seed", () => {
    expect(vision).toMatch(/temperature: 0,/);
    expect(vision).toMatch(/seed: \d+,/);
  });

  it("narrows primarySeason's enum to the candidates for that call", () => {
    expect(vision).toMatch(/candidates\?\.length \? schemaFor\(candidates\) : COLOR_ANALYSIS_SCHEMA/);
    expect(vision).toMatch(/primarySeason as unknown as \{ enum: string\[\] \}\)\.enum = \[\.\.\.candidates\]/);
  });

  it("tells the model which three and never which one leads", () => {
    expect(vision).toMatch(/CANDIDATE SEASONS:/);
    expect(vision).toMatch(/in no order of preference|no order of preference/);
    expect(handler).not.toMatch(/rules\.ranked[^\n]*analyzeOptions|score:\s*rules/);
  });

  it("logs an overrule with the measured values, and never the image", () => {
    const warn = handler.slice(handler.indexOf("model answered outside the candidates"), handler.indexOf("let result = normalizeResult(raw)"));
    for (const field of ["candidates", "margin", "skinBand", "axes", "skin:", "hair:", "eyes:", "hairStatus"]) {
      expect(warn, field).toContain(field);
    }
    expect(warn).not.toMatch(/base64|prepared|buffer/i);
  });
});

describe.runIf(process.env.LIVE_DETERMINISM === "1")("live: the real pipeline, five times", () => {
  it("measures and classifies one demo face five times and gets one season", async () => {
    const { MeasurementSession } = await import("../eval/measure");
    const { handleAnalyze } = await import("../server/handlers/analyze");
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(__dirname, "../.env") });

    const photo = path.join(__dirname, "../client/public/demo-faces/sample-1.webp");
    const session = new MeasurementSession();
    await session.start([photo]);
    const seasons: string[] = [];
    try {
      for (let i = 0; i < RUNS; i++) {
        // Measured afresh each run: the browser half has to be stable too.
        const measured = await session.measure(photo, "dyed");
        expect(measured.ok).toBe(true);
        const form = new FormData();
        form.append("photos", new Blob([Buffer.from(measured.uploadBase64!, "base64") as unknown as BlobPart], { type: "image/jpeg" }), "photo.jpg");
        form.append("features", JSON.stringify(measured.features));
        const response = await handleAnalyze(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
        const { result } = (await response.json()) as { result: { season: string } };
        seasons.push(result.season);
      }
    } finally {
      await session.stop();
    }
    expect(new Set(seasons).size, seasons.join(", ")).toBe(1);
  }, 600_000);
});
