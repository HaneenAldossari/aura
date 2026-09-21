import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { createStageQueue, DEFAULT_MIN_STAGE_MS } from "../measure/stageQueue";
import { en } from "../client/src/i18n/en";

const CLIENT = path.join(__dirname, "../client/src/pages");

function read(relative: string): string {
  return fs.readFileSync(path.join(CLIENT, relative), "utf8");
}

/**
 * Source with comments stripped and every t("key") replaced by its English
 * string.
 *
 * Two reasons for the substitution rather than matching on key names. The
 * assertions below are about what a user actually reads, and a key can be
 * renamed or repointed without the sentence changing — or, worse, the sentence
 * can change while the key stays put. Resolving through the catalogue means
 * this still fails if someone puts "better photos" back in front of a decoder
 * failure, whichever file they put it in.
 *
 * Comments are stripped because the panels quote the very strings being
 * asserted against, while explaining the bug they exist to prevent.
 */
function resolve(key: string): string {
  const value = key.split(".").reduce<any>((node, part) => node?.[part], en);
  return typeof value === "string" ? value : key;
}

function rendered(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Any quoted dotted path that resolves in the catalogue, so a ternary
    // inside t(...) and a key held in a lookup table both substitute.
    .replace(/["'`]([a-z][\w]*(?:\.[\w]+)+)["'`]/g, (whole, key: string) => {
      const value = resolve(key);
      return value === key ? whole : JSON.stringify(value);
    });
}

/**
 * Quality issues and system failures must render in different components.
 *
 * The bug this pins: a decoder .wasm request fell through to the SPA rewrite,
 * the browser reported "Aborted(CompileError: WebAssembly.instantiate()...)",
 * and the user saw it under "Better Photos Needed" — told to re-shoot a photo
 * that was never the problem.
 */
describe("quality issues and system errors render separately", () => {
  const analysis = read("Analysis.tsx");

  it("has a dedicated component for each", () => {
    expect(fs.existsSync(path.join(CLIENT, "analysis/QualityPanel.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(CLIENT, "analysis/SystemErrorPanel.tsx"))).toBe(true);
  });

  it("routes each outcome kind to its own step", () => {
    expect(analysis).toMatch(/outcome\.kind === "system"[\s\S]*?setStep\("system"\)/);
    expect(analysis).toMatch(/outcome\.kind === "quality"[\s\S]*?setStep\("quality"\)/);
  });

  it("renders the two panels under different steps", () => {
    expect(analysis).toMatch(/step === "quality"[\s\S]{0,200}<QualityPanel/);
    expect(analysis).toMatch(/step === "system"[\s\S]{0,300}<SystemErrorPanel/);
  });

  it("never shows the photo-quality heading for a system failure", () => {
    const system = rendered("analysis/SystemErrorPanel.tsx");
    expect(system).not.toMatch(/better photo/i);
    expect(system).toMatch(/on our side/i);
    // Heading, one body line, the privacy line — and nothing else.
    expect(system.match(/<p\b/g)).toHaveLength(2);
  });

  it("says plainly, in that one body line, that the photo is not at fault", () => {
    // The panel renders the message it is handed; both sources of it say so.
    const pipeline = fs.readFileSync(path.join(__dirname, "../measure/pipeline.ts"), "utf8");
    expect(pipeline).toMatch(/this isn't a problem with your photo/);
    expect(JSON.stringify(en.errors)).toMatch(/this isn't a problem with your photo/);
  });

  it("logs the raw error to the console rather than rendering it", () => {
    expect(analysis).toMatch(/console\.error\([\s\S]{0,60}outcome\.error/);
    // The panel takes a prepared message, never the caught error object.
    const system = rendered("analysis/SystemErrorPanel.tsx");
    expect(system).not.toMatch(/\berror\.message\b|String\(error\)/);
  });

  it("does not route a real photo problem to the system screen", () => {
    const quality = rendered("analysis/QualityPanel.tsx");
    expect(quality).toMatch(/retake|another photo/i);
    expect(quality).not.toMatch(/on our side/i);
  });
});

describe("stage dwell", () => {
  /** A controllable clock, so nothing here waits on real time. */
  function harness(minMs = DEFAULT_MIN_STAGE_MS) {
    let clock = 0;
    const timers: { at: number; fn: () => void }[] = [];
    const seen: string[] = [];

    const queue = createStageQueue<string>({
      minMs,
      onChange: (s) => seen.push(s),
      now: () => clock,
      schedule: (fn, ms) => timers.push({ at: clock + ms, fn }),
    });

    const advance = (ms: number) => {
      clock += ms;
      const due = timers.filter((t) => t.at <= clock);
      for (const t of due) timers.splice(timers.indexOf(t), 1);
      for (const t of due) t.fn();
    };

    return { queue, seen, advance };
  }

  it("shows the first stage immediately", () => {
    const { queue, seen } = harness();
    queue.push("a");
    expect(seen).toEqual(["a"]);
  });

  it("holds a stage that would otherwise flash past", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    queue.push("b"); // arrives instantly — must not replace "a" yet
    expect(seen).toEqual(["a"]);

    advance(599);
    expect(seen).toEqual(["a"]);

    advance(1);
    expect(seen).toEqual(["a", "b"]);
  });

  it("does not delay a stage that already ran long enough", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    advance(1200);
    queue.push("b");
    expect(seen).toEqual(["a", "b"]);
  });

  it("never stretches a slow stage beyond its real duration", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    advance(5000); // a genuinely slow stage
    queue.push("b");
    // "b" appears the moment it is reported, not 600 ms later.
    expect(seen).toEqual(["a", "b"]);
  });

  it("collapses a burst rather than replaying a backlog", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    queue.push("b");
    queue.push("c");
    queue.push("d");
    advance(600);
    // Straight to where we actually are, not through b and c in slow motion.
    expect(seen).toEqual(["a", "d"]);
    advance(5000);
    expect(seen).toEqual(["a", "d"]);
  });

  it("delivers a stage that arrives during the dwell window", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    advance(300);
    queue.push("b");
    advance(300);
    expect(seen).toEqual(["a", "b"]);
  });

  it("stops delivering after stop()", () => {
    const { queue, seen, advance } = harness(600);
    queue.push("a");
    queue.push("b");
    queue.stop();
    advance(5000);
    expect(seen).toEqual(["a"]);
  });

  it("defaults to a readable floor", () => {
    expect(DEFAULT_MIN_STAGE_MS).toBeGreaterThanOrEqual(400);
    expect(DEFAULT_MIN_STAGE_MS).toBeLessThanOrEqual(1000);
  });
});
