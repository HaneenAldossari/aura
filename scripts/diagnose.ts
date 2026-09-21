/**
 * Why did this photo get this season?
 *
 *   npm run diagnose -- photo.jpg                     # measurements and ranking only: free
 *   npm run diagnose -- a.jpg b.jpg                   # two photos, tables side by side
 *   npm run diagnose -- photo.jpg --hair=dyed         # natural (default) | dyed | covered
 *   npm run diagnose -- photo.jpg --both-hair         # the same photo under natural AND dyed
 *   npm run diagnose -- photo.jpg --runs=5            # …and ask the model, 5 times (~$0.01 each)
 *
 * Runs the real pipeline — the browser measurement, headless, then score(),
 * then (with --runs) the real /api/analyze handler — and prints every number
 * between the pixels and the verdict: Lab per region, the three axes, the skin
 * band, the full ranking with scores, the three candidates the model is
 * allowed, and what it chose on each run.
 *
 * The photo is read from the path you give, measured in a local headless
 * browser, and (only with --runs) sent to the model exactly as an upload would
 * be. Nothing is written to disk.
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { MeasurementSession } from "../eval/measure";
import { handleAnalyze } from "../server/handlers/analyze";
import { candidateSeasons, rankSeasons, validateFeatures } from "../server/services/hybrid";
import type { HairStatus } from "../measure/seasons.config";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const photos = args.filter((a) => !a.startsWith("--")).map((p) => path.resolve(p));
const RUNS = Number(flag("runs") ?? 0);
const BOTH_HAIR = args.includes("--both-hair");
const HAIR = (flag("hair") ?? "natural") as HairStatus;

interface Column {
  title: string;
  rows: [string, string][];
}

const fmt = (n: number | null | undefined, d = 1) => (typeof n === "number" ? n.toFixed(d) : "—");
const lab = (r: { L: number; C: number; h: number } | null | undefined) =>
  r ? `L* ${fmt(r.L)}  C* ${fmt(r.C)}  h ${fmt(r.h)}°` : "not measured";

async function classify(uploadBase64: string, features: unknown): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("photos", new Blob([Buffer.from(uploadBase64, "base64") as unknown as BlobPart], { type: "image/jpeg" }), "photo.jpg");
  form.append("features", JSON.stringify(features));
  const response = await handleAnalyze(new Request("http://localhost/api/analyze", { method: "POST", body: form }));
  const body = (await response.json()) as { result?: Record<string, unknown>; message?: string };
  if (!response.ok || !body.result) throw new Error(`analyze failed (${response.status}): ${body.message ?? "no result"}`);
  return body.result;
}

async function diagnose(session: MeasurementSession, photo: string, hair: HairStatus): Promise<Column> {
  const title = `${path.basename(photo)} · hair ${hair}`;
  const measured = await session.measure(photo, hair);
  if (!measured.ok || !measured.features) {
    return { title, rows: [["measurement", `FAILED: ${measured.error ?? "quality gate"}`]] };
  }
  const validated = validateFeatures(measured.features);
  if (!validated.ok) return { title, rows: [["features", `rejected: ${validated.reason}`]] };

  const rules = rankSeasons(validated.features);
  const rows: [string, string][] = [
    ["skin", lab(validated.features.skin)],
    ["hair", lab(validated.features.hair)],
    ["eyes", lab(validated.features.eyes)],
    ["skin band", rules.skinBand],
    ["hair used", rules.hairUsed ? "yes" : "no"],
    ["axis · hue", `${fmt(rules.axes.hue.value, 2)}  ${rules.axes.hue.label}`],
    ["axis · value", `${fmt(rules.axes.value.value, 2)}  ${rules.axes.value.label}`],
    ["axis · chroma", `${fmt(rules.axes.chroma.value, 2)}  ${rules.axes.chroma.label}`],
    ["contrast", rules.contrast ? `${fmt(rules.contrast.value, 2)}  ${rules.contrast.label}` : "—"],
    ["", ""],
    ...rules.ranked.slice(0, 6).map((r, i): [string, string] => [`rules #${i + 1}`, `${r.season.padEnd(14)} ${fmt(r.score, 3)}`]),
    ["margin", `${fmt(rules.margin, 3)}${rules.ambiguous ? "  AMBIGUOUS" : ""}`],
    ["candidates", candidateSeasons(rules).join(" · ")],
  ];

  if (RUNS > 0 && measured.uploadBase64) {
    rows.push(["", ""]);
    const seasons: string[] = [];
    for (let i = 1; i <= RUNS; i++) {
      const result = await classify(measured.uploadBase64, measured.features);
      const agreement = result.agreement as { level?: string } | undefined;
      seasons.push(String(result.season));
      rows.push([`model run ${i}`, `${String(result.season).padEnd(14)} ${result.confidence}%  ${result.seasonSource}  agree:${agreement?.level}`]);
    }
    const distinct = [...new Set(seasons)];
    rows.push(["verdict", distinct.length === 1 ? `STABLE — ${distinct[0]} × ${RUNS}` : `UNSTABLE — ${distinct.join(" / ")}`]);
  }
  return { title, rows };
}

function printSideBySide(columns: Column[]) {
  const labelWidth = Math.max(...columns.flatMap((c) => c.rows.map((r) => r[0].length)), 10);
  const widths = columns.map((c) => Math.max(c.title.length, ...c.rows.map((r) => r[1].length)));
  const labels = columns.reduce<string[]>((acc, c) => (c.rows.length > acc.length ? c.rows.map((r) => r[0]) : acc), []);
  const line = (label: string, cells: string[]) =>
    `  ${label.padEnd(labelWidth)}  │ ${cells.map((cell, i) => cell.padEnd(widths[i])).join("  │ ")}`;
  console.log("\n" + line("", columns.map((c) => c.title)));
  console.log(`  ${"─".repeat(labelWidth)}──┼─${widths.map((w) => "─".repeat(w)).join("──┼─")}`);
  labels.forEach((label, row) => console.log(line(label, columns.map((c) => c.rows[row]?.[1] ?? ""))));
  console.log("");
}

async function main() {
  if (photos.length === 0) {
    console.error("usage: npm run diagnose -- <photo> [photo…] [--hair=natural|dyed|covered] [--both-hair] [--runs=N]");
    process.exit(2);
  }
  for (const p of photos) if (!fs.existsSync(p)) { console.error(`not found: ${p}`); process.exit(2); }
  if (RUNS > 0 && !process.env.OPENROUTER_API_KEY) { console.error("--runs needs OPENROUTER_API_KEY"); process.exit(2); }

  const jobs = photos.flatMap((photo) => (BOTH_HAIR ? (["natural", "dyed"] as HairStatus[]) : [HAIR]).map((hair) => ({ photo, hair })));
  if (RUNS > 0) console.log(`  ${jobs.length * RUNS} model calls, about $${(jobs.length * RUNS * 0.01).toFixed(2)}`);

  const session = new MeasurementSession();
  await session.start(photos);
  try {
    const columns: Column[] = [];
    for (const job of jobs) columns.push(await diagnose(session, job.photo, job.hair));
    printSideBySide(columns);
  } finally {
    await session.stop();
  }
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
