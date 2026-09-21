/**
 * The installable shell.
 *
 * The one that matters is the cache name: it is derived from the pinned
 * MediaPipe checksums, so a model change has to invalidate every cached copy.
 * Without that a device serves the old weights forever, and the eval and the
 * user disagree about what was measured with nothing in the repo having
 * changed — the exact failure the version pinning exists to prevent.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { cacheName } from "../scripts/buildServiceWorker";
import { MODEL_SPECS } from "../measure/landmarks";

const PUBLIC = path.join(__dirname, "../client/public");
const sw = fs.readFileSync(path.join(PUBLIC, "sw.js"), "utf8");
const manifest = JSON.parse(
  fs.readFileSync(path.join(PUBLIC, "manifest.webmanifest"), "utf8")
) as Record<string, unknown>;
const html = fs.readFileSync(path.join(__dirname, "../client/index.html"), "utf8");

describe("manifest", () => {
  it("installs standalone on the app's own ground colour", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.background_color).toBe("#0C0A09");
    expect(manifest.theme_color).toBe("#0C0A09");
  });

  it("ships both icon sizes and a maskable pair", () => {
    const icons = manifest.icons as { src: string; sizes: string; purpose?: string }[];
    for (const size of ["192x192", "512x512"]) {
      expect(icons.some((i) => i.sizes === size && !i.purpose), size).toBe(true);
      expect(icons.some((i) => i.sizes === size && i.purpose === "maskable"), size).toBe(true);
    }
    for (const icon of icons) {
      expect(fs.existsSync(path.join(PUBLIC, icon.src)), icon.src).toBe(true);
    }
  });

  it("is linked, with the iOS meta a manifest does not cover", () => {
    expect(html).toMatch(/rel="manifest"/);
    expect(html).toMatch(/apple-touch-icon/);
    expect(html).toMatch(/apple-mobile-web-app-status-bar-style/);
  });
});

describe("service worker", () => {
  it("is versioned by the pinned model checksums", () => {
    expect(sw).toContain(`const CACHE = "${cacheName()}"`);
    expect(cacheName()).toContain(MODEL_SPECS.landmarker.sha256.slice(0, 8));
    expect(cacheName()).toContain(MODEL_SPECS.segmenter.sha256.slice(0, 8));
  });

  it("is regenerated whenever a model is repinned", () => {
    // Fails if someone edits MODEL_SPECS without re-running the generator.
    const stamped = sw.match(/const CACHE = "([^"]+)"/)?.[1];
    expect(stamped).toBe(cacheName());
  });

  it("caches the app shell and the models", () => {
    expect(sw).toMatch(/SHELL = \[[^\]]*"\/index\.html"/);
    expect(sw).toMatch(/storage\.googleapis\.com/);
    expect(sw).toMatch(/\/wasm\//);
  });

  it("never caches the API", () => {
    // A stale analysis served from disk would be somebody else's result.
    expect(sw).toMatch(/pathname\.startsWith\("\/api\/"\)\) return/);
  });

  it("serves navigations network-first", () => {
    // Cache-first on index.html pins an old build on the device forever.
    const nav = sw.slice(sw.indexOf('request.mode === "navigate"'));
    expect(nav.indexOf("fetch(request)")).toBeLessThan(nav.indexOf("caches.match"));
  });

  it("drops caches from a previous version on activate", () => {
    expect(sw).toMatch(/keys\.filter\(\(k\) => k !== CACHE\)\.map\(\(k\) => caches\.delete\(k\)\)/);
  });
});
