import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { analyzePhotos } from "../server/services/claudeVision";

const FACES_DIR = path.join(__dirname, "../client/public/demo-faces");
const OUT_DIR = path.join(__dirname, "../server/demo-analyses");

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(FACES_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
  console.log(`Found ${files.length} demo faces`);

  for (const file of files) {
    const id = path.basename(file, path.extname(file));
    const outPath = path.join(OUT_DIR, `${id}.json`);
    if (fs.existsSync(outPath)) {
      console.log(`  ✓ ${id} (already exists, skipping)`);
      continue;
    }

    const inputPath = path.join(FACES_DIR, file);
    console.log(`  → Analyzing ${id}...`);
    let saved = false;
    for (let attempt = 1; attempt <= 5 && !saved; attempt++) {
      try {
        const result = await analyzePhotos([inputPath]);
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
        console.log(`  ✓ ${id} saved (attempt ${attempt})`);
        saved = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = /\b(429|503|UNAVAILABLE|RESOURCE_EXHAUSTED)\b/.test(msg);
        if (!isRetryable || attempt === 5) {
          console.error(`  ✗ ${id} failed (attempt ${attempt}):`, msg.slice(0, 160));
          break;
        }
        const wait = 8000 * attempt;
        console.log(`     retrying in ${wait / 1000}s (attempt ${attempt} hit ${msg.slice(0, 60)}...)`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    // brief delay to respect free-tier RPM
    await new Promise((r) => setTimeout(r, 4500));
  }
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
