/**
 * Precompute the demo-face analyses the sample gallery serves.
 *
 * These go through the *same* hybrid path a visitor gets: the browser
 * measurement runs headlessly, the canonical sRGB JPEG it produces is what the
 * model sees, and the result is normalised by the same normalizeResult(). That
 * matters because the sample faces are what most visitors open — if they were
 * produced by a shortcut, the demo would show a different product from the one
 * behind the upload button.
 *
 *   npx tsx scripts/precomputeDemoAnalyses.ts          # only missing ones
 *   npx tsx scripts/precomputeDemoAnalyses.ts --force  # all nine again
 *
 * Costs roughly $0.01 per face.
 *
 * ADDING A FACE: drop it in client/public/demo-faces/ named sample-N.webp
 * (the id pattern the demo-load handler pins is /^sample-[0-9]+$/, so the
 * number may be any length), then run this without --force. Nothing else
 * needs editing: the gallery lists whatever the API reports and labels each
 * face with the season its own analysis returned.
 */

import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { MeasurementSession } from "../eval/measure";
import { handleAnalyze } from "../server/handlers/analyze";
import { writeGalleryManifest } from "../server/utils/demoGallery";

const FACES_DIR = path.join(__dirname, "../client/public/demo-faces");
const OUT_DIR = path.join(__dirname, "../server/demo-analyses");
const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const HAIR_ARG = process.argv.find((a) => a.startsWith("--hair="))?.split("=")[1];

/**
 * How to treat the demo faces' hair.
 *
 * Overridable because these are generated images, and CLAUDE.md records that
 * their hair measures near-black and near-neutral (C* <= 2.6 on seven of nine,
 * undefined hue at C* 0). Hair carries a quarter of the chroma axis, so feeding
 * that in makes the rules disagree with the model for a reason that is an
 * artefact of the fixtures rather than of anyone's colouring.
 */
const HAIR_STATUS = (HAIR_ARG ?? "natural") as "natural" | "dyed" | "covered";

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function classify(uploadBase64: string, features: unknown): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append(
    "photos",
    new Blob([base64ToBytes(uploadBase64) as unknown as BlobPart], { type: "image/jpeg" }),
    "photo.jpg"
  );
  form.append("features", JSON.stringify(features));

  const response = await handleAnalyze(
    new Request("http://localhost/api/analyze", { method: "POST", body: form })
  );
  const body = (await response.json()) as { result?: Record<string, unknown>; message?: string };
  if (!response.ok || !body.result) {
    throw new Error(`analyze failed (${response.status}): ${body.message ?? "no result"}`);
  }
  return body.result;
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set — nothing to do.");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(FACES_DIR)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();

  const todo = files
    .filter((f) => !ONLY || path.basename(f, path.extname(f)) === ONLY)
    .filter(
      (f) => FORCE || !fs.existsSync(path.join(OUT_DIR, `${path.basename(f, path.extname(f))}.json`))
    );

  console.log(`${files.length} demo faces, ${todo.length} to analyse${FORCE ? " (forced)" : ""}`);
  if (todo.length === 0) return;

  // One browser and one model download for the whole run.
  const session = new MeasurementSession();
  await session.start(todo.map((f) => path.join(FACES_DIR, f)));

  let failures = 0;
  try {
    for (const file of todo) {
      const id = path.basename(file, path.extname(file));
      const absolute = path.join(FACES_DIR, file);
      process.stdout.write(`  ${id} … `);

      const measured = await session.measure(absolute, HAIR_STATUS);
      if (!measured.ok || !measured.features || !measured.uploadBase64) {
        console.log(`measurement failed: ${measured.error ?? "no features"}`);
        failures++;
        continue;
      }

      try {
        const result = await classify(measured.uploadBase64, measured.features);

        // Keep what the on-device gate said about the photo. The gallery uses
        // it to decide whether a label can be shown plainly: a photo our own
        // quality check flagged for colour cast has no business producing a
        // confident season caption.
        result.qualityIssues = measured.qualityIssues ?? [];
        result.qualityOk = measured.qualityOk ?? null;

        fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(result, null, 2));
        const looks = (result.looks as unknown[] | undefined)?.length ?? 0;
        console.log(
          `${result.season} · ${result.confidence}% · ${looks} look(s)` +
            `${result.measured ? " · measured" : " · NO MEASURED"}`
        );
      } catch (err) {
        console.log(`classify failed: ${err instanceof Error ? err.message.slice(0, 120) : err}`);
        failures++;
      }
    }
  } finally {
    await session.stop();
  }

  // Which of them the gallery shows. Written from every file on disk, not
  // just this run's, so a partial run still leaves the manifest whole.
  const manifest = writeGalleryManifest(OUT_DIR);
  console.log(
    `gallery: ${manifest.shown.length} of ${manifest.shown.length + manifest.hidden.length} shown` +
      ` (confidence >= ${manifest.minConfidence})` +
      (manifest.hidden.length ? `; hidden: ${manifest.hidden.map((h) => `${h.id} ${h.confidence ?? "?"}%`).join(", ")}` : "")
  );

  console.log(failures === 0 ? "Done." : `Done, with ${failures} failure(s).`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
