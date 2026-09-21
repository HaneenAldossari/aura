/**
 * End-to-end check that the decoder WASM is actually served.
 *
 * This exists because of a real failure: the files were copied into a gitignored
 * public/wasm/ from a Vite plugin hook, the copy raced the first request, and a
 * miss fell through to the SPA rewrite. The browser received index.html, tried
 * to instantiate "<!do..." as WebAssembly, and reported
 *
 *   Aborted(CompileError: WebAssembly.instantiate(): expected magic word
 *   00 61 73 6d, found 3c 21 64 6f)
 *
 * which says nothing about the actual cause. A unit test cannot catch this —
 * the bug was in how the dev server and the build resolve a URL, so the check
 * has to run against both real servers.
 *
 *   npx tsx scripts/dev/checkWasm.ts
 */
import { spawn, type ChildProcess } from "child_process";
import path from "path";

const CLIENT_DIR = path.resolve(__dirname, "../../client");

/** Must match the keys the Vite plugin serves and initDecoders() requests. */
const WASM_FILES = [
  "mozjpeg_dec.wasm",
  "squoosh_png_bg.wasm",
  "webp_dec.wasm",
  "mozjpeg_enc.wasm",
] as const;

const MAGIC = [0x00, 0x61, 0x73, 0x6d];

interface Server {
  process: ChildProcess;
  url: string;
}

/**
 * Start a vite command on a fixed port and poll until it answers.
 *
 * Polling rather than parsing stdout: Vite's banner format is not a contract,
 * and a check that exists to catch a serving bug should not itself depend on
 * log scraping.
 */
async function start(args: string[], port: number, label: string): Promise<Server> {
  // detached so the whole group can be signalled: npx spawns vite as a child,
  // and killing npx alone leaves vite holding the port for the next run.
  const child = spawn("npx", ["vite", ...args, "--port", String(port), "--strictPort"], {
    cwd: CLIENT_DIR,
    stdio: "ignore",
    detached: true,
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  const url = `http://localhost:${port}`;

  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await fetch(`${url}/`);
      return { process: child, url };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  stop({ process: child, url });
  throw new Error(`${label}: server did not come up on port ${port}`);
}

/** Kill the whole process group, not just npx. */
function stop(server: Server): void {
  try {
    if (server.process.pid) process.kill(-server.process.pid, "SIGKILL");
  } catch {
    server.process.kill("SIGKILL");
  }
}

async function checkServer(server: Server, label: string): Promise<boolean> {
  console.log(`\n  ${label}  ${server.url}`);
  let allOk = true;

  for (const name of WASM_FILES) {
    const url = `${server.url}/wasm/${name}`;
    let note: string;
    let ok = false;
    try {
      const response = await fetch(url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const head = Array.from(bytes.subarray(0, 4));
      const magicOk = head.every((b, i) => b === MAGIC[i]);
      const type = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        note = `HTTP ${response.status}`;
      } else if (!magicOk) {
        // The exact failure this script exists for: an HTML fallback body.
        const looksHtml = head[0] === 0x3c;
        note = looksHtml
          ? `served HTML, not WASM — the SPA fallback answered (${bytes.byteLength} bytes)`
          : `bad magic ${head.map((b) => b.toString(16).padStart(2, "0")).join(" ")}`;
      } else {
        ok = true;
        note = `${bytes.byteLength} bytes, ${type || "no content-type"}`;
      }
    } catch (error) {
      note = (error as Error).message;
    }

    allOk &&= ok;
    console.log(`    ${ok ? "OK  " : "FAIL"}  /wasm/${name.padEnd(22)} ${note}`);
  }
  return allOk;
}

async function main() {
  const servers: Server[] = [];
  let ok = true;

  try {
    const dev = await start([], 5178, "dev");
    servers.push(dev);
    ok = (await checkServer(dev, "vite dev")) && ok;

    // Build first, so preview has something to serve.
    console.log("\n  building...");
    await new Promise<void>((resolve, reject) => {
      const build = spawn("npx", ["vite", "build"], { cwd: CLIENT_DIR, stdio: "ignore" });
      build.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("build failed"))));
      build.on("error", reject);
    });

    const preview = await start(["preview"], 5179, "preview");
    servers.push(preview);
    ok = (await checkServer(preview, "vite preview (production build)")) && ok;
  } finally {
    for (const server of servers) stop(server);
  }

  console.log(`\n  ${ok ? "All decoder WASM served correctly." : "FAILED — see above."}\n`);
  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
