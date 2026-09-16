import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { describe, expect, it } from "vitest";
import { CODEC_WASM } from "../measure/decode";

const require = createRequire(__filename);

/** WebAssembly magic word: \0asm. */
const MAGIC = [0x00, 0x61, 0x73, 0x6d];

/**
 * Where each file lives inside node_modules. Duplicated from the Vite plugin on
 * purpose: if the two ever disagree, the plugin serves something initDecoders()
 * never asks for, and the browser gets the SPA fallback instead of WASM.
 */
const SOURCES: Record<string, string> = {
  "mozjpeg_dec.wasm": "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
  "squoosh_png_bg.wasm": "@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
  "webp_dec.wasm": "@jsquash/webp/codec/dec/webp_dec.wasm",
};

describe("codec WASM files", () => {
  it("names exactly the three files decode.ts asks for", () => {
    expect(Object.values(CODEC_WASM).sort()).toEqual(Object.keys(SOURCES).sort());
  });

  it.each(Object.entries(SOURCES))("%s resolves and starts with the magic word", (name, specifier) => {
    const resolved = require.resolve(specifier);
    expect(fs.existsSync(resolved), `${name} not found at ${resolved}`).toBe(true);

    const bytes = fs.readFileSync(resolved);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Array.from(bytes.subarray(0, 4)), name).toEqual(MAGIC);
  });

  /**
   * The failure this guards against: /wasm/x.wasm missed, the SPA rewrite
   * answered with index.html, and the browser tried to instantiate "<!do..." as
   * WebAssembly. The reported error was a CompileError about a missing magic
   * word, which says nothing about a misrouted URL.
   */
  it("recognises an HTML body as not-WASM", () => {
    const html = Buffer.from("<!doctype html>\n<html></html>");
    expect(Array.from(html.subarray(0, 4))).not.toEqual(MAGIC);
    // 0x3c is "<" — the first byte of the misleading error.
    expect(html[0]).toBe(0x3c);
  });

  it("keeps the Vite plugin pointing at the same paths", () => {
    const config = fs.readFileSync(
      path.join(__dirname, "../client/vite.config.ts"),
      "utf8"
    );
    for (const [name, specifier] of Object.entries(SOURCES)) {
      expect(config, `plugin is missing ${name}`).toContain(name);
      expect(config, `plugin is missing ${specifier}`).toContain(specifier);
    }
  });
});
