/**
 * One-time asset pass: convert client/public PNG/JPG images to WebP with
 * sane max dimensions. Deletes the originals after successful conversion.
 * Usage: npx tsx scripts/convertImagesToWebp.ts
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PUBLIC_DIR = path.join(__dirname, "../client/public");

// dir (relative to public) → max width/height
const TARGETS: Array<{ dir: string; max: number }> = [
  { dir: "seasons", max: 1600 },
  { dir: "demo-faces", max: 800 },
  { dir: "makeup", max: 600 },
  { dir: "haircolors", max: 600 },
  { dir: "gemstones", max: 600 },
];

async function convertDir(dir: string, max: number): Promise<[number, number]> {
  let before = 0;
  let after = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const [b, a] = await convertDir(full, max);
      before += b;
      after += a;
      continue;
    }
    if (!/\.(png|jpe?g)$/i.test(entry.name)) continue;
    const out = full.replace(/\.(png|jpe?g)$/i, ".webp");
    const inputSize = fs.statSync(full).size;
    try {
      await sharp(full)
        .resize(max, max, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(out);
      before += inputSize;
      after += fs.statSync(out).size;
      fs.unlinkSync(full);
    } catch (err) {
      console.error(`  failed: ${full}`, (err as Error).message);
    }
  }
  return [before, after];
}

async function main() {
  let totalBefore = 0;
  let totalAfter = 0;
  for (const { dir, max } of TARGETS) {
    const abs = path.join(PUBLIC_DIR, dir);
    if (!fs.existsSync(abs)) continue;
    const [b, a] = await convertDir(abs, max);
    console.log(
      `${dir.padEnd(12)} ${(b / 1e6).toFixed(1)}MB → ${(a / 1e6).toFixed(1)}MB`
    );
    totalBefore += b;
    totalAfter += a;
  }
  console.log(
    `TOTAL        ${(totalBefore / 1e6).toFixed(1)}MB → ${(totalAfter / 1e6).toFixed(1)}MB`
  );
}

main();
