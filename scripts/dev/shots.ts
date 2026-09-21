/**
 * Every screen and state, photographed.
 *
 *   npm run shots              # boots its own API + Vite, costs nothing
 *   npm run shots -- --live    # …but makes the one real shop check (~$0.003)
 *   npm run shots -- <url>     # against a stack that is already running
 *   npm run shots -- --live --publish
 *                              # …and refresh the four tab previews Home shows
 *
 * Writes dev/shots/<route>-<width>.png at 390 and 1440 and prints the list.
 * The folder is emptied first, so the list printed is the list on disk.
 *
 * It spends no OpenRouter credit by default, and cannot by accident:
 *
 *   - Results come from a demo face, which is a precomputed JSON read.
 *   - /api/analyze is blocked outright. The one flow that uploads a real photo
 *     is the Loading shot, and that is held two stages earlier anyway.
 *   - The shop check is answered by a stub, built from the demo result's own
 *     canonical palette so the colours in the shot are real ones. The score,
 *     verdict and product name are NOT model output — the list marks the file
 *     as stubbed so nobody reads it as evidence of what the model says.
 *
 * --publish writes client/public/previews/<tab>.webp and the manifest beside
 * Home's WhatYouGet.tsx: the top of each Results tab at phone width, cropped
 * from just under the tab bar. Home shows those captures as its "what you get"
 * previews, so they are the real screens by construction. It insists on --live:
 * a stubbed shop result must never be published as what the product says.
 *
 * States are reached the way a person reaches them, not by poking React:
 * a photo with no face in it for the quality panel, a blocked model download
 * for the system panel. Loading is caught by holding the second model download,
 * which pins the screen at stage 3 of 5 for as long as we like — a sleep
 * would catch whatever stage the network happened to be on.
 */
import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import sharp from "sharp";
import { en } from "../../client/src/i18n/en";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "dev/shots");
const API_PORT = 3102;
const WEB_PORT = 5181;
const WIDTHS = [390, 1440] as const;

/** The deepest demo face, and the one whose season the rules and the model agree on. */
const DEMO_FACE = 1;
const FACE_PHOTO = path.join(ROOT, "client/public/demo-faces/sample-4.webp");
/** A picture with no face in it: fails the quality gate on-device, so nothing uploads. */
const NO_FACE_PHOTO = path.join(ROOT, "client/public/seasons/winter.webp");
const PRODUCT_PHOTO = path.join(ROOT, "client/public/seasons/autumn.webp");

const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const PUBLISH = args.includes("--publish");

const PREVIEW_DIR = path.join(ROOT, "client/public/previews");
const PREVIEW_MANIFEST = path.join(ROOT, "client/src/pages/home/previews.json");
/** CSS px of each tab that Home's frame can show, plus a little for its fade. */
const PREVIEW_HEIGHT = 660;
const PREVIEW_WIDTH = 390;

interface Preview {
  src: string;
  width: number;
  height: number;
}
const previews: Record<string, Preview> = {};
let previewSeason = "";

/** The top of the current Results tab, from just under the tab bar, as WebP. */
async function publishPreview(page: Page, id: string) {
  const { top, pageHeight } = await page.evaluate(() => {
    window.scrollTo(0, 0);
    const tabs = document.querySelector(".ed-tabs");
    return {
      top: Math.ceil((tabs?.getBoundingClientRect().bottom ?? 0) + window.scrollY) + 8,
      pageHeight: document.documentElement.scrollHeight,
    };
  });
  const height = Math.min(PREVIEW_HEIGHT, pageHeight - top);
  const png = await page.screenshot({ fullPage: true, clip: { x: 0, y: top, width: PREVIEW_WIDTH, height } });
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const info = await sharp(png).webp({ quality: 80 }).toFile(path.join(PREVIEW_DIR, `${id}.webp`));
  previews[id] = { src: `/previews/${id}.webp`, width: info.width, height: info.height };
  console.log(`      published previews/${id}.webp  ${info.width}×${info.height}  ${Math.round(info.size / 1024)} KB`);
}
const givenUrl = args.find((a) => /^https?:\/\//.test(a));

// ─────────────────────────────────────────────────────────────────────────────
// Processes
// ─────────────────────────────────────────────────────────────────────────────

const started: ChildProcess[] = [];

function launch(command: string, argv: string[], cwd: string, env: NodeJS.ProcessEnv) {
  // detached so the whole group dies: npx spawns the real process as a child.
  started.push(spawn(command, argv, { cwd, detached: true, stdio: "ignore", env: { ...process.env, ...env } }));
}

function stopAll() {
  for (const child of started) {
    try {
      if (child.pid) process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

async function waitForHttp(url: string, label: string, attempts = 120) {
  for (let i = 0; i < attempts; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`${label} never came up at ${url}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Capture
// ─────────────────────────────────────────────────────────────────────────────

interface Shot {
  file: string;
  /** Pixel size of the file itself, read back from it — not the page's. */
  pixels: string;
  kb: number;
  notes: string[];
}

/** Width and height from a PNG's IHDR chunk: two big-endian uint32s at byte 16. */
function pngSize(file: string): string {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, header, 0, 24, 0);
  fs.closeSync(fd);
  return `${header.readUInt32BE(16)}×${header.readUInt32BE(20)}`;
}

const shots: Shot[] = [];
const failures: string[] = [];

/** Walk the page so lazy images have loaded, then wait out fonts and entrances. */
async function settle(page: Page, extraMs = 600) {
  await page.evaluate(async () => {
    const step = Math.max(200, window.innerHeight / 2);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => (img.onload = img.onerror = r))),
    );
  });
  await page.waitForTimeout(extraMs);
}

interface SnapOptions {
  /** Capture the viewport rather than the whole page. For overlays: a fixed
      panel in a full-page capture lands at the foot of the document, which is
      somewhere no reader ever sees it. */
  viewportOnly?: boolean;
  /** Capture one element, with breathing room. */
  element?: string;
  notes?: string[];
  settleMs?: number;
}

async function snap(page: Page, route: string, width: number, options: SnapOptions = {}) {
  const file = path.join(OUT, `${route}-${width}.png`);
  await settle(page, options.settleMs);

  const notes = [...(options.notes ?? [])];
  const layout = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
  }));
  if (layout.scroll > layout.client) notes.push(`SCROLLS SIDEWAYS ${layout.scroll}>${layout.client}`);

  if (options.element) {
    const target = page.locator(options.element).first();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error(`${options.element} has no box`);
    const pad = 24;
    const scrollY = await page.evaluate(() => window.scrollY);
    await page.screenshot({
      path: file,
      fullPage: true,
      clip: {
        x: Math.max(0, box.x - pad),
        y: Math.max(0, box.y + scrollY - pad),
        width: Math.min(layout.client, box.width + pad * 2),
        height: box.height + pad * 2,
      },
    });
    notes.push("element");
  } else {
    await page.screenshot({ path: file, fullPage: !options.viewportOnly });
    if (options.viewportOnly) notes.push("viewport");
  }

  const kb = Math.round(fs.statSync(file).size / 1024);
  shots.push({ file: path.relative(ROOT, file), pixels: pngSize(file), kb, notes });
  console.log(`    ✓ ${route}-${width}.png`);
}

/** One state failing must not cost the rest of the run. */
async function attempt(label: string, width: number, run: () => Promise<void>) {
  try {
    await run();
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    failures.push(`${label}-${width}: ${message}`);
    console.log(`    ✗ ${label}-${width}  — ${message.slice(0, 140)}`);
  }
}

async function newPage(ctx: BrowserContext, errors: string[]) {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  // Belt and braces: whatever else this script does, it never pays for an analysis.
  await page.route("**/api/analyze", (route) => route.abort());
  return page;
}

async function captureWidth(browser: Browser, base: string, width: number) {
  console.log(`\n  ${width}px`);
  const ctx = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    // Phone shots at 2x: at 1x a 390px capture is too soft to judge type in.
    deviceScaleFactor: width < 600 ? 2 : 1,
    hasTouch: width < 600,
  });
  const errors: string[] = [];
  const analysing = en.analysis.analyse;

  // ── Home ──
  const page = await newPage(ctx, errors);
  await attempt("home", width, async () => {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
    await snap(page, "home", width, { settleMs: 1800 }); // entrance: 0.8s delay + 0.8s
  });

  // ── Upload, and the gallery on it ──
  await attempt("upload", width, async () => {
    await page.goto(`${base}/analyse`, { waitUntil: "networkidle" });
    await snap(page, "upload", width);
  });
  await attempt("gallery", width, async () => {
    await page.goto(`${base}/analyse#samples`, { waitUntil: "networkidle" });
    await page.waitForSelector("#samples img");
    await snap(page, "gallery", width, { element: "#samples" });
  });

  // ── Results, from one demo face ──
  let resultsUrl = "";
  const publishing = PUBLISH && width === PREVIEW_WIDTH;
  page.on("response", async (response) => {
    if (!response.url().includes("/api/demo-load")) return;
    const body = (await response.json().catch(() => null)) as { result?: { season?: string } } | null;
    if (body?.result?.season) previewSeason = body.result.season;
  });
  await attempt("results-overview", width, async () => {
    await page.goto(`${base}/analyse`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: en.analysis.samples.itemLabel.replace("{n}", String(DEMO_FACE)), exact: true }).click();
    await page.waitForURL(/\/results\/[^/?]+/, { timeout: 60_000 });
    resultsUrl = page.url().split("?")[0];
    await snap(page, "results-overview", width, { settleMs: 1200 });
    if (publishing) await publishPreview(page, "overview");
  });

  for (const tab of ["beauty", "style", "shop"] as const) {
    await attempt(`results-${tab}`, width, async () => {
      if (!resultsUrl) throw new Error("no results to open — the demo face did not load");
      // By URL, not by click: the tab in the address bar is a feature, and this exercises it.
      await page.goto(`${resultsUrl}?tab=${tab}`, { waitUntil: "networkidle" });
      await page.waitForSelector(`[role="tab"][aria-selected="true"]`);
      await snap(page, `results-${tab}`, width);
      // Shop's preview is the result, published below — not the empty dropzone.
      if (publishing && tab !== "shop") await publishPreview(page, tab);
    });
  }

  // ── Before You Buy, with a result ──
  await attempt("before-you-buy", width, async () => {
    if (!resultsUrl) throw new Error("no results to open — the demo face did not load");
    const id = resultsUrl.split("/").pop()!;
    if (!LIVE) {
      await page.route("**/api/link-check-image", async (route) => {
        const sent = route.request().postData() ?? "";
        const analysis = JSON.parse(sent.match(/name="analysis"\r?\n\r?\n([\s\S]*?)\r?\n--/)?.[1] ?? "{}");
        const best: { name: string; hex: string }[] = analysis.palette?.best ?? [];
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            productName: "Stubbed product — not a model result",
            productColor: best[0]?.name ?? "—",
            hex: best[0]?.hex ?? "#000000",
            matchScore: 88,
            verdict: "great",
            reason: "Placeholder text from scripts/dev/shots.ts. Run with --live for a real check.",
            tip: "Placeholder text from scripts/dev/shots.ts.",
            similarColors: best.slice(0, 3),
          }),
        });
      });
    }
    // The old standalone route: it should redirect into the Shop tab.
    await page.goto(`${base}/before-you-buy/${id}`, { waitUntil: "networkidle" });
    await page.waitForURL(/tab=shop/);
    await page.setInputFiles('input[type="file"]', PRODUCT_PHOTO);
    await page.waitForSelector(".ed-score", { timeout: LIVE ? 90_000 : 15_000 });
    await snap(page, "before-you-buy", width, { notes: [LIVE ? "live model call" : "STUBBED result"] });
    if (publishing) await publishPreview(page, "before-you-buy");
    await page.unroute("**/api/link-check-image");
  });

  // ── Chat, open ──
  await attempt("chat-open", width, async () => {
    if (!resultsUrl) throw new Error("no results to open — the demo face did not load");
    await page.goto(resultsUrl, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: en.results.chat.openLabel }).first().click();
    await page.getByLabel(en.results.chat.panelLabel).waitFor();
    await snap(page, "chat-open", width, { viewportOnly: true });
  });
  await page.close();

  // ── Loading, mid-stage ──
  // Hold the segmenter download: stages 1-2 are done, 3 is active, 4-5 are waiting.
  await attempt("loading", width, async () => {
    const loading = await newPage(ctx, errors);
    const held: (() => void)[] = [];
    await loading.route("**/selfie_multiclass_256x256*", (route) => {
      held.push(() => void route.abort().catch(() => {}));
    });
    await loading.goto(`${base}/analyse`, { waitUntil: "domcontentloaded" });
    await loading.setInputFiles('input[type="file"]', FACE_PHOTO);
    await loading.getByRole("button", { name: analysing, exact: true }).click();
    await loading.waitForFunction(
      () => {
        const stages = Array.from(document.querySelectorAll(".an-stage"));
        const active = stages.findIndex((s) => s.classList.contains("an-stage--active"));
        return active >= 2 && stages.filter((s) => s.classList.contains("an-stage--done")).length >= 2;
      },
      undefined,
      { timeout: 180_000 },
    );
    const stage = await loading.evaluate(() => {
      const stages = Array.from(document.querySelectorAll(".an-stage"));
      const i = stages.findIndex((s) => s.classList.contains("an-stage--active"));
      return `stage ${i + 1}/${stages.length}: ${stages[i]?.querySelector(".an-stage__title")?.textContent?.trim()}`;
    });
    await snap(loading, "loading", width, { notes: [stage], settleMs: 300 });
    held.forEach((release) => release());
    await loading.close();
  });

  // ── Quality failure: no face, so it never leaves the device ──
  await attempt("quality-failure", width, async () => {
    const quality = await newPage(ctx, errors);
    let uploaded = false;
    quality.on("request", (r) => (uploaded ||= r.url().includes("/api/analyze")));
    await quality.goto(`${base}/analyse`, { waitUntil: "networkidle" });
    await quality.setInputFiles('input[type="file"]', NO_FACE_PHOTO);
    await quality.getByRole("button", { name: analysing, exact: true }).click();
    await quality.waitForSelector(".an-state", { timeout: 180_000 });
    const title = (await quality.locator(".an-title").first().innerText()).trim();
    await snap(quality, "quality-failure", width, { notes: [`“${title}”`, uploaded ? "PHOTO WAS UPLOADED" : "nothing uploaded"] });
    await quality.close();
  });

  // ── System error: the model cannot be fetched ──
  await attempt("system-error", width, async () => {
    const system = await newPage(ctx, errors);
    await system.route("**/mediapipe-models/**", (route) => route.abort());
    await system.goto(`${base}/analyse`, { waitUntil: "networkidle" });
    await system.setInputFiles('input[type="file"]', FACE_PHOTO);
    await system.getByRole("button", { name: analysing, exact: true }).click();
    await system.waitForSelector(".an-state", { timeout: 120_000 });
    const title = (await system.locator(".an-title").first().innerText()).trim();
    await snap(system, "system-error", width, { notes: [`“${title}”`] });
    await system.close();
  });

  // The system-error page aborts requests on purpose; those are not findings.
  const real = errors.filter((e) => !/mediapipe|Failed to fetch|aborted|ERR_FAILED/i.test(e));
  if (real.length) console.log(`    page errors: ${[...new Set(real)].join(" | ")}`);
  await ctx.close();
}

async function main() {
  if (PUBLISH && !LIVE) {
    console.error("\n  --publish needs --live: Home must never show a stubbed shop result as the product's.\n");
    process.exit(2);
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let base = givenUrl?.replace(/\/$/, "");
  if (!base) {
    base = `http://localhost:${WEB_PORT}`;
    console.log(`\n  booting API :${API_PORT} and Vite :${WEB_PORT}…`);
    launch("npx", ["tsx", "server/index.ts"], ROOT, {
      PORT: String(API_PORT),
      CORS_ORIGINS: `http://localhost:${WEB_PORT}`,
    });
    launch("npx", ["vite", "--port", String(WEB_PORT), "--strictPort"], path.join(ROOT, "client"), {
      VITE_API_BASE: `http://localhost:${API_PORT}/api`,
    });
    await waitForHttp(`http://localhost:${API_PORT}/api/health`, "api");
    await waitForHttp(`${base}/`, "web");
  }
  console.log(`  shooting ${base}${LIVE ? "  (--live: the shop check is a real model call)" : "  (no model calls)"}`);

  const browser = await chromium.launch();
  try {
    for (const width of WIDTHS) await captureWidth(browser, base, width);
  } finally {
    await browser.close();
    stopAll();
  }

  if (PUBLISH) {
    const wanted = ["overview", "beauty", "style", "before-you-buy"];
    const missing = wanted.filter((id) => !previews[id]);
    if (missing.length || !previewSeason) {
      failures.push(`publish: missing ${missing.join(", ") || "season"} — manifest left as it was`);
    } else {
      const manifest = {
        season: previewSeason,
        capturedOn: new Date().toISOString().slice(0, 10),
        tabs: Object.fromEntries(wanted.map((id) => [id, previews[id]])),
      };
      fs.writeFileSync(PREVIEW_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
      console.log(`\n  published ${wanted.length} previews for ${previewSeason} → client/public/previews/`);
    }
  }

  shots.sort((a, b) => a.file.localeCompare(b.file));
  console.log(`\n  ${shots.length} screenshots in dev/shots/\n`);
  for (const s of shots) {
    console.log(`    ${s.file.padEnd(40)} ${s.pixels.padEnd(11)} ${String(s.kb).padStart(5)} KB  ${s.notes.join(" · ")}`);
  }
  if (failures.length) {
    console.log(`\n  ${failures.length} FAILED`);
    for (const f of failures) console.log(`    ✗ ${f}`);
  }
  console.log("");
  process.exit(failures.length ? 1 : 0);
}

// However this ends — finished, interrupted, or an error thrown from inside a
// Playwright callback where no try/finally can see it — the two servers it
// started must not outlive it holding their ports.
process.on("exit", stopAll);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));
process.on("uncaughtException", (err) => {
  console.error(err);
  process.exit(1);
});

main().catch((err) => {
  console.error(err);
  stopAll();
  process.exit(1);
});
