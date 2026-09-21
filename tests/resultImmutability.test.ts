/**
 * A result is immutable once displayed.
 *
 * The bug: on the live site a result changed from Deep Autumn to Light Spring
 * while its owner was scrolling — no reload, no re-upload. The cause was the
 * hair note's link on Results: one tap re-measured the cached photo under the
 * other hair answer, called /api/analyze a second time and replaced the page's
 * result in place (`navigate(…, { replace: true })`). Deep Autumn with hair
 * counted and Light Spring with hair left out is the same pair CLAUDE.md
 * records for one demo face, so the second answer was "right" — it was the
 * silent replacement that was the defect.
 *
 * Every other suspect was checked and cleared, and these keep them cleared:
 * no timer, focus handler, refetch or retry touches a result; nothing renders
 * before the server has answered; every writer uses a fresh id.
 *
 * The behavioural half lives in scripts/dev/e2e.ts: exactly one analyze call
 * per upload, and the season text never changes after first render.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import { loadResult, newResultId, saveResult } from "../client/src/lib/resultStore";
import type { AnalysisResult } from "../client/src/lib/types";

const SRC = path.join(__dirname, "../client/src");
const read = (file: string) => fs.readFileSync(path.join(SRC, file), "utf8");
/** Code only: the comments in these files describe the bug, in its own words. */
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const result = (season: string) => ({ season }) as unknown as AnalysisResult;

describe("the store is write-once", () => {
  it("keeps the first result saved under an id and refuses the second", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const id = newResultId();
    expect(saveResult(id, result("Deep Autumn"))).toBe(true);
    expect(saveResult(id, result("Light Spring"))).toBe(false);
    expect(loadResult(id)?.season).toBe("Deep Autumn");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("immutable"));
    error.mockRestore();
  });

  it("gives every analysis its own id", () => {
    const ids = new Set(Array.from({ length: 200 }, newResultId));
    expect(ids.size).toBe(200);
  });
});

describe("the results page never runs an analysis or writes a result", () => {
  const results = code("pages/Results.tsx");
  const resultsDir = fs.readdirSync(path.join(SRC, "pages/results")).filter((f) => /\.tsx?$/.test(f));

  it("imports nothing that could", () => {
    expect(results).not.toMatch(/analyzeMeasured|analyzePhoto|measureBytes|measureFile|saveResult|cachePhoto\b/);
    for (const file of resultsDir) {
      expect(code(`pages/results/${file}`), file).not.toMatch(/analyzeMeasured|saveResult|\/analyze\b/);
    }
  });

  it("never replaces one result with another in place", () => {
    expect(results).not.toMatch(/navigate\(`\/results\/[^)]*replace:\s*true/);
  });

  it("sends a different hair answer to Upload instead", () => {
    expect(results).toMatch(/navigate\(`\/analyse\?redo=\$\{sessionId\}`\)/);
    const note = code("pages/results/HairNote.tsx");
    expect(note).toMatch(/onClick=\{onRedo\}/);
    expect(note).not.toMatch(/rerunning|onChange/);
  });

  it("reads its result once per id, from the local store, and never over the network", () => {
    const hook = code("pages/results/useResultsData.ts");
    expect(hook).toMatch(/\}, \[sessionId\]\);/);
    expect(hook).not.toMatch(/fetch\(|setInterval|setTimeout|visibilitychange|addEventListener/);
  });
});

describe("nothing re-fetches, retries or polls a result", () => {
  const files = ["pages/Results.tsx", "pages/results/useResultsData.ts", "lib/resultStore.ts", "lib/api.ts"];
  it.each(files)("%s has no timer, focus or storage listener", (file) => {
    expect(code(file)).not.toMatch(/setInterval|"visibilitychange"|"focus"|"storage"|"online"|refetch/);
  });

  it("the analyse call is made once, with no retry loop around it", () => {
    const api = code("lib/api.ts");
    const calls = api.match(/fetch\(`\$\{BASE\}\/analyze`/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(api).not.toMatch(/for\s*\([^)]*attempt|while\s*\([^)]*retr|retries/i);
  });
});

describe("no preliminary result is ever shown", () => {
  const analysis = code("pages/Analysis.tsx");

  it("saves and navigates only after the server has answered", () => {
    const upload = analysis.slice(analysis.indexOf("const handleAnalyze"));
    const answered = upload.indexOf("await analyzeMeasured(");
    expect(answered).toBeGreaterThan(0);
    expect(upload.indexOf("saveResult(")).toBeGreaterThan(answered);
    expect(upload.indexOf("navigate(`/results/")).toBeGreaterThan(answered);

    const sample = analysis.slice(analysis.indexOf("const handleSampleClick"), analysis.indexOf("const handleAnalyze"));
    expect(sample.indexOf("saveResult(")).toBeGreaterThan(sample.indexOf("await loadDemoSample("));
  });

  it("has no rules-only render path: the client never scores a face itself", () => {
    expect(analysis).not.toMatch(/\bscore\(|preliminary|rulesOnly/);
    // If one is ever added it must say so on screen; the catalogue has no such word yet.
    expect(read("i18n/en.ts")).not.toMatch(/preliminary/i);
  });

  it("re-doing an analysis loads the photo and then waits to be asked", () => {
    const redo = analysis.slice(analysis.indexOf('params.get("redo")'), analysis.indexOf("const handleFileSelect"));
    expect(redo).toMatch(/getCachedPhoto\(redoFor\)/);
    expect(redo).not.toMatch(/handleAnalyze|analyzeMeasured|navigate\(/);
  });
});
