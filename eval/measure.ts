/**
 * Driving browser measurement from Node.
 *
 * Boots one Chromium and one tiny static server for the whole run: the
 * MediaPipe models are ~20 MB and the codecs are WASM, so paying that once and
 * measuring every photo in the same page is the difference between a run that
 * takes a minute and one that takes an hour.
 */

import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright";
import type { HairStatus } from "../measure/seasons.config";
import type { BrowserMeasurement } from "./measureBrowser";

const ROOT = path.resolve(__dirname, "..");

/** Codec WASM, served so initDecoders() can fetch it by URL. */
const WASM: Record<string, string> = {
  "/wasm/mozjpeg_dec.wasm": "node_modules/@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
  "/wasm/squoosh_png_bg.wasm": "node_modules/@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
  "/wasm/webp_dec.wasm": "node_modules/@jsquash/webp/codec/dec/webp_dec.wasm",
  "/wasm/mozjpeg_enc.wasm": "node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
};

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
};

export class MeasurementSession {
  private browser!: Browser;
  private page!: Page;
  private server!: Server;
  private port = 0;
  /** Absolute image path -> served URL path. */
  private served = new Map<string, string>();

  async start(imagePaths: string[]): Promise<void> {
    for (const [i, absolute] of imagePaths.entries()) {
      this.served.set(absolute, `/img/${i}${path.extname(absolute)}`);
    }

    // ESM, not IIFE: the emscripten codec glue reads import.meta.url, and an
    // IIFE has none — esbuild substitutes an empty string and emscripten throws
    // "Failed to construct 'URL': Invalid URL".
    const bundled = await build({
      entryPoints: [path.join(__dirname, "measureBrowser.ts")],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      write: false,
      logLevel: "silent",
    });
    const js = bundled.outputFiles[0].text;

    const urlToFile = new Map([...this.served].map(([file, url]) => [url, file]));

    this.server = createServer((req, res) => {
      const url = (req.url ?? "/").split("?")[0];
      if (url === "/") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end('<!doctype html><meta charset="utf-8"><script type="module" src="/b.js"></script>');
        return;
      }
      if (url === "/b.js") {
        res.writeHead(200, { "content-type": "text/javascript" });
        res.end(js);
        return;
      }
      const source = WASM[url] ? path.join(ROOT, WASM[url]) : urlToFile.get(url);
      if (source && fs.existsSync(source)) {
        res.writeHead(200, { "content-type": MIME[path.extname(source)] ?? "application/octet-stream" });
        res.end(fs.readFileSync(source));
        return;
      }
      res.writeHead(404).end();
    });

    await new Promise<void>((resolve) =>
      this.server.listen(0, "127.0.0.1", () => {
        const address = this.server.address();
        this.port = typeof address === "object" && address ? address.port : 0;
        resolve();
      })
    );

    this.browser = await chromium.launch();
    this.page = await this.browser.newPage();
    await this.page.goto(`http://localhost:${this.port}/`, { waitUntil: "load" });
    await this.page.waitForFunction(() => Boolean(window.__auraEval), null, { timeout: 60_000 });
  }

  async measure(absolutePath: string, hairStatus: HairStatus): Promise<BrowserMeasurement> {
    const url = this.served.get(absolutePath);
    if (!url) return { ok: false, error: `not served: ${absolutePath}` };
    return this.page.evaluate(
      ([u, h]) => window.__auraEval.measure(u as string, h as HairStatus),
      [url, hairStatus] as const
    );
  }

  async stop(): Promise<void> {
    await this.browser?.close();
    this.server?.close();
  }
}
