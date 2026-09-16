import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { copyFileSync, mkdirSync } from "fs";
import path from "path";

/**
 * Copy the @jsquash codec .wasm files into public/wasm/.
 *
 * measure/decode.ts calls initDecoders("/wasm/") and fetches them by URL rather
 * than relying on bundler resolution. Left to themselves the codecs locate their
 * .wasm via import.meta.url, which breaks under any bundler that rewrites or
 * inlines the emscripten glue — the symptom is an opaque
 * "Failed to construct 'URL': Invalid URL" at first decode.
 */
function copyCodecWasm(): Plugin {
  const sources: Record<string, string> = {
    "mozjpeg_dec.wasm": "@jsquash/jpeg/codec/dec/mozjpeg_dec.wasm",
    "squoosh_png_bg.wasm": "@jsquash/png/codec/pkg/squoosh_png_bg.wasm",
    "webp_dec.wasm": "@jsquash/webp/codec/dec/webp_dec.wasm",
  };
  const copy = (root: string) => {
    const dest = path.join(root, "public", "wasm");
    mkdirSync(dest, { recursive: true });
    for (const [name, source] of Object.entries(sources)) {
      copyFileSync(path.join(root, "..", "node_modules", source), path.join(dest, name));
    }
  };
  return {
    name: "copy-codec-wasm",
    // buildStart covers `vite build`; configureServer covers `vite dev`.
    buildStart() {
      copy(process.cwd());
    },
    configureServer() {
      copy(process.cwd());
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyCodecWasm()],
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
