/**
 * Precompute the one shop check Home shows.
 *
 *   npx tsx scripts/precomputeDemoCheck.ts                       # the black dress
 *   npx tsx scripts/precomputeDemoCheck.ts --image=path/to.jpg --slug=black-dress
 *   npx tsx scripts/precomputeDemoCheck.ts --crop=0,0,1,0.86     # left,top,width,height as fractions
 *
 * Home's "Before You Buy" card shows a real result: this product photo, checked
 * by the real handler against the real Deep Winter demo analysis, once, and
 * cached. Not a mock-up, and not a live call either — a landing page must not
 * spend credit per visitor. Costs about $0.003 per run.
 *
 * The analysis it is checked against is loaded the way /api/demo-load serves
 * it, so the card and the demo results page describe the same person.
 *
 * --crop removes a shop label or watermark from the source photo before it is
 * either checked or published: the model should judge the garment, and the
 * landing page should not carry someone else's branding.
 *
 * Writes:
 *   client/public/demo-products/<slug>.webp   the photo Home shows
 *   server/demo-checks/<slug>.json            the cached result + provenance
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import sharp from "sharp";

dotenv.config({ path: path.join(__dirname, "../.env") });

import { handleDemoLoad, handleLinkCheckImage } from "../server/handlers/tools";

const ROOT = path.join(__dirname, "..");
const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const SLUG = arg("slug") ?? "black-dress";
const AGAINST = arg("against") ?? "sample-1";
const SOURCE_DIR = path.join(ROOT, "design/demo-products");
const PUBLIC_DIR = path.join(ROOT, "client/public/demo-products");
const OUT_DIR = path.join(ROOT, "server/demo-checks");

function findSource(): string | null {
  const given = arg("image");
  if (given) return fs.existsSync(given) ? path.resolve(given) : null;
  if (!fs.existsSync(SOURCE_DIR)) return null;
  const match = fs
    .readdirSync(SOURCE_DIR)
    .find((f) => path.basename(f, path.extname(f)).toLowerCase() === SLUG && /\.(png|jpe?g|webp|avif)$/i.test(f));
  return match ? path.join(SOURCE_DIR, match) : null;
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is not set — nothing to do.");
    process.exit(1);
  }
  const source = findSource();
  if (!source) {
    console.error(`No product photo. Expected ${path.relative(ROOT, SOURCE_DIR)}/${SLUG}.(jpg|png|webp), or pass --image=<path>.`);
    process.exit(1);
  }

  // ── The photo: cropped, upright, web-sized ──
  let image = sharp(source).rotate();
  const crop = arg("crop")?.split(",").map(Number);
  if (crop && crop.length === 4 && crop.every((n) => n >= 0 && n <= 1)) {
    const meta = await sharp(source).rotate().toBuffer({ resolveWithObject: true });
    const { width, height } = meta.info;
    image = sharp(meta.data).extract({
      left: Math.round(crop[0] * width),
      top: Math.round(crop[1] * height),
      width: Math.round(crop[2] * width),
      height: Math.round(crop[3] * height),
    });
  }
  const published = await image
    .resize({ width: 800, height: 1000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, `${SLUG}.webp`), published.data);

  // ── The analysis, exactly as the demo results page receives it ──
  const demo = await handleDemoLoad(
    new Request("http://localhost/api/demo-load", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sampleId: AGAINST }),
    })
  );
  const { result: analysis } = (await demo.json()) as { result?: Record<string, unknown> };
  if (!demo.ok || !analysis) throw new Error(`could not load ${AGAINST} (${demo.status})`);

  // ── The check: the published pixels, through the real handler ──
  const form = new FormData();
  form.append("photo", new Blob([published.data as unknown as BlobPart], { type: "image/webp" }), `${SLUG}.webp`);
  form.append("analysis", JSON.stringify(analysis));
  const response = await handleLinkCheckImage(
    new Request("http://localhost/api/link-check-image", { method: "POST", body: form })
  );
  const result = (await response.json()) as Record<string, unknown>;
  if (!response.ok || typeof result.matchScore !== "number") {
    throw new Error(`shop check failed (${response.status}): ${JSON.stringify(result).slice(0, 200)}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const record = {
    slug: SLUG,
    image: `/demo-products/${SLUG}.webp`,
    imageWidth: published.info.width,
    imageHeight: published.info.height,
    against: AGAINST,
    season: analysis.season,
    checkedOn: new Date().toISOString().slice(0, 10),
    result,
  };
  fs.writeFileSync(path.join(OUT_DIR, `${SLUG}.json`), JSON.stringify(record, null, 2) + "\n");
  console.log(`${SLUG} against ${AGAINST} (${analysis.season}): ${result.matchScore} / 100 · ${result.verdict}`);
  console.log(`  ${result.reason}`);
  console.log(`  wrote client/public/demo-products/${SLUG}.webp and server/demo-checks/${SLUG}.json`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
