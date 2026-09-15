/**
 * Initialise the @jsquash WASM codecs for Node.
 *
 * In a browser the codecs fetch their .wasm over HTTP, which is exactly what we
 * want in the app and in the Playwright eval. Under Node there is no origin to
 * fetch from, so `decode()` fails with "fetch failed". Each codec's `init()`
 * accepts a pre-compiled WebAssembly.Module, so tests compile the .wasm straight
 * off disk and hand it over.
 *
 * This is a test-environment shim only. Nothing in measure/ depends on it.
 */
import fs from "fs";
import path from "path";

/** node_modules/@jsquash, found relative to this file rather than via import.meta. */
const JSQUASH_ROOT = path.join(__dirname, "../../node_modules/@jsquash");

async function compile(relativeWasmPath: string): Promise<WebAssembly.Module> {
  return WebAssembly.compile(fs.readFileSync(path.join(JSQUASH_ROOT, relativeWasmPath)));
}

let ready: Promise<void> | undefined;

/** Idempotent: safe to await from every test that needs a real decode. */
export function initCodecs(): Promise<void> {
  ready ??= (async () => {
    const [jpeg, png, webp] = await Promise.all([
      import("@jsquash/jpeg/decode"),
      import("@jsquash/png/decode"),
      import("@jsquash/webp/decode"),
    ]);
    await jpeg.init(await compile("jpeg/codec/dec/mozjpeg_dec.wasm"));
    await png.init(await compile("png/codec/pkg/squoosh_png_bg.wasm"));
    await webp.init(await compile("webp/codec/dec/webp_dec.wasm"));
  })();
  return ready;
}
