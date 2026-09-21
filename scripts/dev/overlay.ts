/**
 * Region-overlay dev tool.
 *
 * Runs landmarks.ts, regions.ts and quality.ts for real, in headless Chromium,
 * and writes annotated PNGs plus per-region statistics. This exists because
 * those three modules cannot be exercised in Node — MediaPipe's WASM runtime and
 * the @jsquash codecs both fetch over HTTP — so without it they would sit
 * untested until the Playwright eval.
 *
 * It is also how the landmark index sets get checked: the only way to know that
 * index 116 is on a cheek and not a jawline is to look at it drawn on a face.
 *
 *   npx tsx scripts/dev/overlay.ts [imagePath ...]
 *
 * Output goes to dev/, which is gitignored. Dev-only; nothing imports this.
 */
import { createServer } from "http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { build } from "esbuild";
import { chromium } from "playwright";
import type { OverlayReport } from "./overlayBrowser";

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "dev");

/** A light-skinned and a deep-skinned demo face, by measured centre luminance. */
const DEFAULT_IMAGES = [
  "client/public/demo-faces/sample-4.webp", // lightest of the nine
  "client/public/demo-faces/sample-1.webp", // deepest of the nine
];

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".wasm": "application/wasm",
};

async function bundle(): Promise<string> {
  const result = await build({
    entryPoints: [path.join(__dirname, "overlayBrowser.ts")],
    bundle: true,
    // ESM, not IIFE: the emscripten codec glue reads `import.meta.url` to work
    // out its own script directory, and an IIFE has no import.meta at all —
    // esbuild substitutes an empty string and emscripten then throws
    // "Failed to construct 'URL': Invalid URL". Vite emits ESM too, so this also
    // matches how the real client will load these modules.
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

/** The codec .wasm files, served so initDecoders() can fetch them by URL. */
const WASM_SOURCES: Record<string, string> = {
  "/wasm/mozjpeg_dec.wasm": "node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
  "/wasm/squoosh_png_bg.wasm": "node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
  "/wasm/webp_dec.wasm": "node_modules/@jsquash/webp/codec/dec/webp_dec.wasm",
  // The encoder too: toCanonicalJpeg() runs in this rig as well, and its 404
  // surfaced as a codec error that read like a decode failure.
  "/wasm/mozjpeg_enc.wasm": "node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
};

function serve(bundleJs: string, images: string[]): Promise<{ port: number; close: () => void }> {
  const served = new Map<string, Buffer>();
  for (const image of images) {
    served.set(`/${path.basename(image)}`, readFileSync(path.join(ROOT, image)));
  }
  for (const [url, source] of Object.entries(WASM_SOURCES)) {
    served.set(url, readFileSync(path.join(ROOT, source)));
  }

  const server = createServer((req, res) => {
    const url = (req.url ?? "/").split("?")[0];
    if (url === "/" || url === "/index.html") {
      res.writeHead(200, { "content-type": "text/html" });
      // Cross-origin isolation is not needed; the codecs use plain WASM.
      res.end(
        `<!doctype html><meta charset="utf-8"><title>overlay</title>` +
          `<script type="module" src="/bundle.js"></script>`
      );
      return;
    }
    if (url === "/bundle.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      res.end(bundleJs);
      return;
    }
    const file = served.get(url);
    if (file) {
      res.writeHead(200, { "content-type": MIME[path.extname(url)] ?? "application/octet-stream" });
      res.end(file);
      return;
    }
    res.writeHead(404).end("not found");
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ port, close: () => server.close() });
    });
  });
}

function formatReport(report: OverlayReport, pngPath: string): string {
  const lines: string[] = [];
  const q = report.quality;

  lines.push("");
  lines.push(`  ${path.basename(report.file)}  ${report.width}x${report.height}  gamut=${report.gamut}`);
  if (report.profileDescription) lines.push(`    ICC profile: ${report.profileDescription}`);
  lines.push(`    quality gate: ${q.ok ? "PASS" : "FAIL"}  score ${q.score.toFixed(2)}`);
  if (q.issues.length === 0) {
    lines.push(`      no issues`);
  } else {
    for (const issue of q.issues) lines.push(`      [${issue.code}] ${issue.message}`);
  }
  if (q.metrics) {
    const m = q.metrics;
    const fmt = (v: number | null, digits = 3) =>
      v === null || v === undefined ? "n/a" : Number(v).toFixed(digits);
    lines.push(
      `      face ${fmt(m.faceHeightFraction)} of frame · laplacian ${fmt(m.laplacianVariance, 1)} · ` +
        `luma ${fmt(m.meanLuminance)} · clipped ${fmt(m.clippedFraction)} · ` +
        `sclera cast ${fmt(m.scleraCast, 2)} · detail ratio ${fmt(m.skinDetailRatio, 2)}`
    );
  }

  lines.push("");
  lines.push(`    region   pixels  considered   median L*      a*      b*       C*     h(deg)`);
  lines.push(`    ${"-".repeat(74)}`);
  for (const r of report.regions) {
    const lab = r.medianLab;
    const lch = r.lch;
    const cell = (v: number | undefined) => (v === undefined ? "     -" : v.toFixed(2).padStart(7));
    const status = r.unavailable ? `  <${r.unavailable}>` : "";
    lines.push(
      `    ${r.name.padEnd(8)} ${String(r.count).padStart(6)} ${String(r.considered).padStart(11)}   ` +
        `${cell(lab?.L)} ${cell(lab?.a)} ${cell(lab?.b)} ${cell(lch?.C)} ${cell(lch?.h)}${status}`
    );
  }
  lines.push("");
  lines.push(`    overlay: ${pngPath}`);
  return lines.join("\n");
}

async function main() {
  const images = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_IMAGES;
  for (const image of images) {
    if (!existsSync(path.join(ROOT, image))) {
      console.error(`  missing image: ${image}`);
      process.exit(1);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`\n  bundling measure/ for the browser...`);
  const bundleJs = await bundle();
  const { port, close } = await serve(bundleJs, images);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error(`    [browser] ${msg.text()}`);
  });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load" });
  // Module scripts resolve asynchronously; wait for the entry to register.
  await page.waitForFunction(() => Boolean(window.__aura), null, { timeout: 30_000 });

  const reports: OverlayReport[] = [];
  for (const image of images) {
    const name = path.basename(image);
    process.stdout.write(`  ${name}: `);
    try {
      const report = (await page.evaluate(async (file) => {
        const stages: string[] = [];
        const result = await window.__aura.analyse(file, (s) => stages.push(s));
        return { ...result, stages };
      }, `/${name}`)) as OverlayReport & { stages: string[] };

      const pngPath = path.join(OUT_DIR, `overlay-${path.parse(name).name}.png`);
      writeFileSync(
        pngPath,
        Buffer.from(report.overlayPng.replace(/^data:image\/png;base64,/, ""), "base64")
      );
      console.log("done");
      console.log(formatReport(report, path.relative(ROOT, pngPath)));
      reports.push(report);
    } catch (error) {
      console.log("FAILED");
      console.error(`    ${(error as Error).message.split("\n")[0]}`);
      const cause = (error as { cause?: unknown }).cause;
      if (cause) console.error(`    cause: ${String((cause as Error)?.message ?? cause)}`);
    }
  }

  if (reports.length) {
    const jsonPath = path.join(OUT_DIR, "overlay-report.json");
    writeFileSync(
      jsonPath,
      JSON.stringify(
        reports.map(({ overlayPng: _drop, ...rest }) => rest),
        null,
        2
      )
    );
    console.log(`\n  report: ${path.relative(ROOT, jsonPath)}\n`);
  }

  await browser.close();
  close();
  if (reports.length !== images.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
