import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * The @jsquash decoder WASM, served at /wasm/*.
 *
 * measure/decode.ts calls initDecoders("/wasm/") and fetches these by URL rather
 * than relying on bundler resolution: left alone the codecs locate their .wasm
 * via import.meta.url, which breaks under any bundler that rewrites or inlines
 * the emscripten glue.
 *
 * Served straight out of node_modules in dev and emitted as build assets in
 * production. An earlier version copied them into public/wasm/ from a plugin
 * hook, which failed in two ways at once: public/wasm/ is gitignored so it is
 * empty on a fresh checkout, and the copy raced the first request. A miss there
 * falls through to the SPA rewrite and returns index.html, so the browser tried
 * to instantiate "<!do..." as WebAssembly and reported a CompileError about a
 * missing magic word. Nothing about that error points at the real cause, which
 * is why this now avoids the filesystem round trip entirely.
 */
const CODEC_WASM: Record<string, string> = {
  "mozjpeg_dec.wasm": "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
  "squoosh_png_bg.wasm": "@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
  "webp_dec.wasm": "@jsquash/webp/codec/dec/webp_dec.wasm",
  // The encoder runs on every successful analysis (encode.ts).
  "mozjpeg_enc.wasm": "@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
};

/** WebAssembly magic word: \0asm. Every file we serve must start with it. */
const WASM_MAGIC = Buffer.from([0x00, 0x61, 0x73, 0x6d]);

function resolveCodec(specifier: string): string {
  return require.resolve(specifier);
}

function readCodec(name: string): Buffer {
  const bytes = readFileSync(resolveCodec(CODEC_WASM[name]));
  if (!bytes.subarray(0, 4).equals(WASM_MAGIC)) {
    throw new Error(
      `${name} does not start with the WebAssembly magic word — refusing to serve it.`
    );
  }
  return bytes;
}

function codecWasm(): Plugin {
  return {
    name: "codec-wasm",

    // Dev: serve from node_modules, ahead of the SPA fallback.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0];
        if (!url.startsWith("/wasm/")) return next();
        const name = url.slice("/wasm/".length);
        if (!(name in CODEC_WASM)) return next();
        try {
          const bytes = readCodec(name);
          res.setHeader("Content-Type", "application/wasm");
          res.setHeader("Content-Length", String(bytes.byteLength));
          res.end(bytes);
        } catch (error) {
          next(error);
        }
      });
    },

    // Build: emit as real assets at dist/wasm/*.
    generateBundle() {
      for (const name of Object.keys(CODEC_WASM)) {
        this.emitFile({
          type: "asset",
          fileName: `wasm/${name}`,
          source: readCodec(name),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), codecWasm()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
