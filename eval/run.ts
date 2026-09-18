/**
 * The accuracy harness.
 *
 *   npx tsx eval/run.ts                          default model, all three modes
 *   npx tsx eval/run.ts --models gemini-flash,claude-sonnet
 *   npx tsx eval/run.ts --modes hybrid
 *   npx tsx eval/run.ts --include-consensus      report consensus rows too
 *   npx tsx eval/run.ts --bootstrap              label eval/inbox/ by agreement
 *   npx tsx eval/run.ts --confusion              print the 12x12 grid
 *
 * The rule this harness exists to enforce: **only eval/real produces the
 * accuracy number.** Synthetic faces are reported separately as a pipeline
 * smoke test — did measurement and classification complete — never as
 * correctness. See eval/README.md.
 */

import fs from "fs";
import path from "path";
import "dotenv/config";
import { score, type MeasuredFeatures } from "../measure/score";
import { SEASONS, type Season } from "../measure/seasons.config";
import {
  EVAL_DIR,
  countsTowardAccuracy,
  imagePath,
  inboxFiles,
  readLabels,
  summarise,
  writeLabels,
  type LabelRow,
} from "./dataset";
import { MeasurementSession } from "./measure";
import { computeMetrics, renderConfusion, renderMetrics, type Prediction } from "./metrics";
import { classify, estimateCost, resolveProviders, type ModeName, type Provider } from "./providers";

const MODES: ModeName[] = ["llm_only", "rules_only", "hybrid"];

interface Options {
  models: string[];
  modes: ModeName[];
  includeConsensus: boolean;
  bootstrap: boolean;
  confusion: boolean;
}

function parseArgs(argv: string[]): Options {
  const value = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
  };
  const modes = (value("--modes") ?? "").split(",").filter(Boolean) as ModeName[];
  for (const m of modes) {
    if (!MODES.includes(m)) throw new Error(`Unknown mode "${m}". Use: ${MODES.join(", ")}`);
  }
  return {
    models: (value("--models") ?? "").split(",").filter(Boolean),
    modes: modes.length ? modes : MODES,
    includeConsensus: argv.includes("--include-consensus"),
    bootstrap: argv.includes("--bootstrap"),
    confusion: argv.includes("--confusion"),
  };
}

/** One (provider, mode) combination over one set of rows. */
interface RunKey {
  provider: Provider;
  mode: ModeName;
}

function keyLabel(k: RunKey): string {
  return k.mode === "rules_only" ? "rules_only" : `${k.provider.label} · ${k.mode}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const providers = resolveProviders(options.models);

  console.log("\n  AURA EVAL");
  console.log(`  ${"═".repeat(72)}`);

  const rows = readLabels();
  if (rows.length === 0) {
    printUsage();
    return;
  }

  const summary = summarise(rows);
  console.log(
    `  dataset: ${summary.total} rows — ${summary.real} real, ${summary.synthetic} synthetic`
  );
  console.log(
    `  ${summary.scored} count toward accuracy` +
      (summary.consensus ? `, ${summary.consensus} consensus (excluded unless --include-consensus)` : "") +
      (summary.unlabelled ? `, ${summary.unlabelled} unlabelled` : "")
  );
  if (summary.missingFiles.length) {
    console.log(`  MISSING FILES: ${summary.missingFiles.join(", ")}`);
  }

  if (options.bootstrap) {
    await runBootstrap(providers);
    return;
  }

  const scored = rows.filter((r) =>
    options.includeConsensus ? r.dataset === "real" && r.season !== "" : countsTowardAccuracy(r)
  );
  const smoke = rows.filter((r) => r.dataset === "synthetic");
  const present = [...scored, ...smoke].filter((r) => fs.existsSync(imagePath(r)));

  if (present.length === 0) {
    console.log("\n  Nothing to run: no labelled images found on disk.\n");
    printUsage();
    return;
  }

  // Cost is easy to underestimate here: it is providers x LLM modes x photos.
  const llmModes = options.modes.filter((m) => m !== "rules_only");
  const calls = providers.length * llmModes.length * present.length;
  const estimate = providers.reduce((sum, p) => sum + estimateCost(p) * llmModes.length * present.length, 0);
  console.log(
    `\n  plan: ${providers.length} model(s) x ${options.modes.length} mode(s) x ${present.length} photo(s)`
  );
  console.log(`  ${calls} model call(s), roughly $${estimate.toFixed(2)}\n`);

  // ── Measure once per photo; every mode reuses it ──
  const session = new MeasurementSession();
  const measured = new Map<string, MeasuredFeatures>();
  const measureNotes = new Map<string, string>();

  process.stdout.write("  measuring... ");
  await session.start(present.map(imagePath));
  for (const row of present) {
    const result = await session.measure(imagePath(row), "natural");
    if (result.ok && result.features) {
      measured.set(row.file, result.features);
    } else {
      measureNotes.set(row.file, result.error ?? "measurement failed");
    }
  }
  await session.stop();
  console.log(`${measured.size}/${present.length} ok`);
  for (const [file, note] of measureNotes) console.log(`    ${file}: ${note}`);

  // ── Run every (provider, mode) ──
  const results: { key: RunKey; scored: Prediction[]; smoke: Prediction[] }[] = [];

  for (const provider of providers) {
    for (const mode of options.modes) {
      // rules_only does not vary by provider; run it once.
      if (mode === "rules_only" && provider !== providers[0]) continue;

      const key: RunKey = { provider, mode };
      const scoredPredictions: Prediction[] = [];
      const smokePredictions: Prediction[] = [];

      process.stdout.write(`  ${keyLabel(key).padEnd(34)}`);
      for (const row of present) {
        const prediction = await predict(row, key, measured.get(row.file) ?? null);
        (row.dataset === "real" ? scoredPredictions : smokePredictions).push(prediction);
        process.stdout.write(prediction.error ? "!" : prediction.predicted === row.season ? "." : "x");
      }
      console.log("");
      results.push({ key, scored: scoredPredictions, smoke: smokePredictions });
    }
  }

  // ── Report ──
  console.log(`\n  ACCURACY — eval/real only`);
  console.log(`  ${"═".repeat(72)}`);
  if (scored.length === 0) {
    console.log("\n  No real labelled photos yet, so there is no accuracy number.");
    console.log("  Everything below is a pipeline smoke test and says nothing about correctness.");
  } else {
    for (const r of results) {
      console.log("");
      console.log(renderMetrics(keyLabel(r.key), computeMetrics(r.scored)));
      if (options.confusion) console.log(renderConfusion(computeMetrics(r.scored)));
    }
  }

  if (smoke.length > 0) {
    console.log(`\n\n  SMOKE TEST — eval/synthetic, NOT accuracy`);
    console.log(`  ${"═".repeat(72)}`);
    console.log(
      `  AI-generated faces have no ground-truth colouring. These rows check that\n` +
        `  the pipeline completes, not that it is right. Excluded from every figure above.\n`
    );
    for (const r of results) {
      const completed = r.smoke.filter((p) => p.predicted !== null).length;
      const agreed = r.smoke.filter((p) => p.predicted === p.expected).length;
      console.log(
        `    ${keyLabel(r.key).padEnd(34)} completed ${completed}/${r.smoke.length}` +
          `   matched the stored label ${agreed}/${r.smoke.length}` +
          `   $${r.smoke.reduce((s, p) => s + p.costUsd, 0).toFixed(4)}`
      );
    }
    printSmokeDetail(results[results.length - 1]?.smoke ?? []);
  }

  writeResults(results, options);
}

async function predict(
  row: LabelRow,
  key: RunKey,
  features: MeasuredFeatures | null
): Promise<Prediction> {
  const base = {
    file: row.file,
    expected: row.season as Season,
    skinBand: null as Prediction["skinBand"],
    agreement: null as Prediction["agreement"],
  };

  if (!features) {
    return {
      ...base,
      predicted: null,
      secondary: null,
      confidence: null,
      latencyMs: 0,
      costUsd: 0,
      error: "no measurement",
    };
  }

  const rules = score(features);

  if (key.mode === "rules_only") {
    return {
      ...base,
      predicted: rules.primary,
      secondary: rules.secondary,
      confidence: rules.ranked[0].score,
      skinBand: rules.skinBand,
      latencyMs: 0,
      costUsd: 0,
    };
  }

  const imageFile = imagePath(row);
  const base64 = fs.readFileSync(imageFile).toString("base64");
  const mime = path.extname(imageFile) === ".png" ? "image/png"
    : path.extname(imageFile) === ".webp" ? "image/webp" : "image/jpeg";

  const outcome = await classify(
    key.provider,
    base64,
    mime,
    key.mode,
    key.mode === "hybrid" ? features : null,
    key.mode === "hybrid" ? rules : null
  );

  // Agreement is computed after the model has committed — it never saw the ranking.
  const agreement =
    key.mode === "hybrid" && outcome.season
      ? outcome.season === rules.primary
        ? "primary"
        : outcome.season === rules.secondary
          ? "secondary"
          : "none"
      : null;

  return {
    ...base,
    predicted: outcome.season,
    secondary: outcome.secondary,
    confidence: outcome.confidence,
    skinBand: rules.skinBand,
    agreement,
    latencyMs: outcome.latencyMs,
    costUsd: outcome.costUsd,
    error: outcome.error,
  };
}

function printSmokeDetail(predictions: Prediction[]): void {
  if (predictions.length === 0) return;
  console.log(`\n    per photo (last run above):`);
  console.log(`      ${"file".padEnd(26)}${"stored".padEnd(16)}${"predicted".padEnd(16)}band`);
  for (const p of predictions) {
    console.log(
      `      ${p.file.padEnd(26)}${String(p.expected || "—").padEnd(16)}` +
        `${String(p.predicted ?? p.error ?? "—").slice(0, 15).padEnd(16)}${p.skinBand ?? "—"}`
    );
  }
}

/**
 * Label eval/inbox/ by agreement across providers.
 *
 * Where at least three independent runs agree, the row is written with
 * source=consensus — which the accuracy metrics then ignore. It is a way to
 * triage a pile of photos, not a way to manufacture ground truth.
 */
async function runBootstrap(providers: Provider[]): Promise<void> {
  const files = inboxFiles();
  if (files.length === 0) {
    console.log("\n  eval/inbox/ is empty — nothing to bootstrap.\n");
    return;
  }
  if (providers.length < 3) {
    console.log(
      `\n  Bootstrapping needs at least three independent opinions; got ${providers.length}.` +
        `\n  Try: --models gemini-flash,gemini-pro,claude-sonnet,gpt-mini\n`
    );
    return;
  }

  console.log(`\n  BOOTSTRAP — ${files.length} file(s) in eval/inbox/\n`);

  const session = new MeasurementSession();
  await session.start(files.map((f) => path.join(EVAL_DIR, f)));

  const rows = readLabels();
  const review: string[] = ["file,candidates"];

  for (const file of files) {
    const absolute = path.join(EVAL_DIR, file);
    const measurement = await session.measure(absolute, "natural");
    if (!measurement.ok || !measurement.features) {
      console.log(`  ${file}: measurement failed — ${measurement.error}`);
      continue;
    }

    const rules = score(measurement.features);
    const votes: Season[] = [rules.primary];

    const base64 = fs.readFileSync(absolute).toString("base64");
    for (const provider of providers) {
      const outcome = await classify(provider, base64, "image/jpeg", "llm_only", null, null);
      if (outcome.season) votes.push(outcome.season);
    }

    const tally = votes.reduce<Record<string, number>>((acc, s) => {
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {});
    const [best, count] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];

    if (count >= 3) {
      rows.push({
        file,
        season: best as Season,
        dataset: "real",
        source: "consensus",
        notes: `${count}/${votes.length} agreed`,
      });
      console.log(`  ${file}: ${best} (${count}/${votes.length}) → provisional, source=consensus`);
    } else {
      review.push(`${file},"${votes.join(" | ")}"`);
      console.log(`  ${file}: no consensus (${votes.join(", ")}) → review.csv`);
    }
  }

  await session.stop();
  writeLabels(rows);
  fs.writeFileSync(path.join(EVAL_DIR, "review.csv"), review.join("\n") + "\n");
  console.log(`\n  labels.csv updated. Disagreements in eval/review.csv.`);
  console.log(`  Consensus rows never count toward accuracy — confirm them by hand in label.html.\n`);
}

function writeResults(
  results: { key: RunKey; scored: Prediction[]; smoke: Prediction[] }[],
  options: Options
): void {
  const dir = path.join(EVAL_DIR, "results");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${stamp}.json`);

  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        options,
        runs: results.map((r) => ({
          provider: r.key.provider.label,
          modelId: r.key.provider.modelId,
          mode: r.key.mode,
          accuracy: computeMetrics(r.scored),
          smoke: {
            n: r.smoke.length,
            completed: r.smoke.filter((p) => p.predicted !== null).length,
            predictions: r.smoke,
          },
        })),
      },
      null,
      2
    )
  );
  console.log(`\n  written: ${path.relative(path.resolve(EVAL_DIR, ".."), file)}\n`);
}

function printUsage(): void {
  console.log(`
  No labels yet.

  eval/labels.csv columns: file,season,dataset,source,notes
    dataset   real | synthetic
    source    manual | consensus | provisional
    season    one of: ${SEASONS.slice(0, 4).join(", ")}, ...

  To measure accuracy you need real photos:
    1. Put them in eval/real/ (daylight near a window, no makeup, no filters,
       hair visible, neutral background, phone defaults).
    2. Label them: npx tsx eval/serveLabeller.ts  →  http://localhost:5199
    3. Run: npx tsx eval/run.ts

  Synthetic faces in eval/synthetic/ are smoke tests only and never produce an
  accuracy number, however many you add.
`);
}

main().catch((err) => {
  console.error("\n  eval failed:", err);
  process.exit(1);
});
