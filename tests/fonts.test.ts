/**
 * First paint does not wait on a third party.
 *
 * The Latin faces used to arrive through a render-blocking stylesheet on
 * fonts.googleapis.com, which also held back every script after it. Measured on
 * Home, 2026-09-21: Lighthouse mobile performance 72 with it, 95 without. These
 * keep it from coming back by accident — one pasted <link> would do it.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const CLIENT = path.join(__dirname, "../client");
const html = fs.readFileSync(path.join(CLIENT, "index.html"), "utf8");
const fontsCss = fs.readFileSync(path.join(CLIENT, "src/styles/fonts.css"), "utf8");
const indexCss = fs.readFileSync(path.join(CLIENT, "src/index.css"), "utf8");

describe("self-hosted Latin faces", () => {
  it("declares all three families, from files that exist", () => {
    for (const family of ["Cormorant Garamond", "Archivo", "IBM Plex Mono"]) {
      expect(fontsCss).toContain(`font-family: "${family}"`);
    }
    const files = [...fontsCss.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThanOrEqual(10);
    for (const file of files) {
      expect(fs.existsSync(path.join(CLIENT, "src/assets/fonts", file)), file).toBe(true);
    }
  });

  it("covers the weights and the italic the display face is set in", () => {
    expect(fontsCss).toMatch(/"Cormorant Garamond";\s*font-style: normal;\s*font-weight: 300 600;/);
    expect(fontsCss).toMatch(/"Cormorant Garamond";\s*font-style: italic;\s*font-weight: 300 400;/);
  });

  it("swaps rather than hiding text while a face loads", () => {
    const faces = fontsCss.match(/@font-face/g)?.length ?? 0;
    expect(fontsCss.match(/font-display: swap/g)?.length).toBe(faces);
  });

  it("is imported by the app stylesheet", () => {
    expect(indexCss).toMatch(/@import "\.\/styles\/fonts\.css";/);
  });

  it("preloads the two faces the first screen is set in", () => {
    expect(html).toMatch(/rel="preload"[\s\S]{0,120}cormorant-garamond-300-600-latin\.woff2/);
    expect(html).toMatch(/rel="preload"[\s\S]{0,120}archivo-400-600-latin\.woff2/);
  });
});

describe("no render-blocking font stylesheet", () => {
  // Every <link rel="stylesheet"> outside <noscript>, which only applies when
  // there is no script to be blocked.
  const live = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
  const sheets = [...live.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].map((m) => m[0]);

  it("requests no Latin family from Google at all", () => {
    expect(html).not.toMatch(/family=(Cormorant|Archivo|IBM\+Plex\+Mono|Bodoni)/);
  });

  it("loads what remains — the Arabic faces — without blocking", () => {
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) {
      expect(sheet).toMatch(/media="print"/);
      expect(sheet).toMatch(/onload="this\.media='all'"/);
    }
  });
});
