/**
 * Acceptance harness for candidate demo faces.
 *
 * Drop images in eval/candidates/, run this, and it reports which ones are fit
 * to ship in the sample gallery — measuring each through the real browser
 * pipeline and applying the gallery's own standard rather than an eyeball.
 *
 *   npx tsx scripts/vetDemoFaces.ts              # report only
 *   npx tsx scripts/vetDemoFaces.ts --promote    # copy the passes into the gallery
 *
 * A face passes when all four hold:
 *   - the quality gate finds no colour cast
 *   - measured skin chroma sits in the range real skin occupies (C* 12-25)
 *   - the rules and the model agree at PRIMARY level
 *   - exactly one face is found
 *
 * The third needs a classification call, so vetting costs about $0.01 a face.
 */

import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { MeasurementSession } from "../eval/measure";
import { handleAnalyze } from "../server/handlers/analyze";

const CANDIDATES = path.join(__dirname, "../eval/candidates");
const GALLERY = path.join(__dirname, "../client/public/demo-faces");
const PROMOTE = process.argv.includes("--promote");

/** Real skin chroma. Outside this the image has been graded, not photographed. */
const SKIN_CHROMA = { min: 12, max: 25 };

function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function classify(uploadBase64: string, features: unknown) {
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
  if (!response.ok || !body.result) throw new Error(body.message ?? `HTTP ${response.status}`);
  return body.result;
}

async function main() {
  if (!fs.existsSync(CANDIDATES)) {
    console.error(`No candidates directory. Put images in ${path.relative(process.cwd(), CANDIDATES)}/`);
    process.exit(1);
  }
  const files = fs.readdirSync(CANDIDATES).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  if (files.length === 0) {
    console.error("No candidate images found.");
    process.exit(1);
  }

  const session = new MeasurementSession();
  await session.start(files.map((f) => path.join(CANDIDATES, f)));

  const rows: string[] = [];
  const passes: string[] = [];
  try {
    for (const file of files) {
      const absolute = path.join(CANDIDATES, file);
      const measured = await session.measure(absolute, "natural");

      if (!measured.ok || !measured.features || !measured.uploadBase64) {
        rows.push(`${file.padEnd(22)} | — | — | — | REJECT · ${measured.error ?? "no features"}`);
        continue;
      }

      const skin = measured.features.skin;
      const chroma = Math.hypot(skin.C ?? 0, 0) || skin.C;
      const cast = (measured.qualityIssues ?? []).includes("colour_cast");

      let season = "—", level = "—", verdict = "";
      try {
        const result = await classify(measured.uploadBase64, measured.features);
        season = String(result.season ?? "—");
        level = String((result.agreement as { level?: string })?.level ?? "none");
      } catch (err) {
        verdict = `REJECT · classify failed: ${err instanceof Error ? err.message.slice(0, 60) : err}`;
      }

      const reasons: string[] = [];
      if (cast) reasons.push("colour cast");
      if (chroma < SKIN_CHROMA.min || chroma > SKIN_CHROMA.max) {
        reasons.push(`skin C* ${chroma.toFixed(1)} outside ${SKIN_CHROMA.min}-${SKIN_CHROMA.max}`);
      }
      if (level !== "primary") reasons.push(`agreement ${level}`);
      if (!verdict) verdict = reasons.length === 0 ? "PASS" : `REJECT · ${reasons.join(", ")}`;

      rows.push(
        `${file.padEnd(22)} | L* ${skin.L.toFixed(1).padStart(5)} | C* ${chroma.toFixed(1).padStart(4)} | ` +
          `${season.padEnd(13)} | ${level.padEnd(9)} | ${verdict}`
      );
      if (verdict === "PASS") passes.push(file);
    }
  } finally {
    await session.stop();
  }

  console.log("\nfile                   | skin L* | skin C* | season        | agreement | verdict");
  console.log("-".repeat(108));
  rows.forEach((r) => console.log(r));
  console.log(`\n${passes.length} of ${files.length} fit to ship.`);

  if (PROMOTE && passes.length > 0) {
    const existing = fs
      .readdirSync(GALLERY)
      .map((f) => Number(f.match(/^sample-(\d+)\./)?.[1] ?? 0));
    let next = Math.max(0, ...existing) + 1;
    for (const file of passes) {
      const target = path.join(GALLERY, `sample-${next}${path.extname(file)}`);
      fs.copyFileSync(path.join(CANDIDATES, file), target);
      console.log(`  promoted ${file} → ${path.basename(target)}`);
      next++;
    }
    console.log("\nNow run: npx tsx scripts/precomputeDemoAnalyses.ts");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
