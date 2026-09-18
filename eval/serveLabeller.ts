/**
 * Local endpoint behind eval/label.html.
 *
 *   npx tsx eval/serveLabeller.ts   →   http://localhost:5199
 *
 * Deliberately localhost-only and unauthenticated: it writes labels.csv, so it
 * must never be reachable from anywhere else. Binding to 127.0.0.1 is the whole
 * access control, which is fine for a tool that only ever runs on the machine
 * holding the photos.
 */

import { createServer } from "http";
import fs from "fs";
import path from "path";
import {
  EVAL_DIR,
  imagePath,
  inboxFiles,
  readLabels,
  writeLabels,
  type LabelRow,
} from "./dataset";

const PORT = Number(process.env.LABEL_PORT) || 5199;

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Everything on disk under real/, synthetic/ and inbox/, labelled or not. */
function currentRows(): LabelRow[] {
  const labelled = readLabels();
  const known = new Set(labelled.map((r) => r.file));
  const rows = [...labelled];

  for (const dir of ["real", "synthetic"] as const) {
    const full = path.join(EVAL_DIR, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full)) {
      if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
      const file = `${dir}/${name}`;
      if (!known.has(file)) {
        rows.push({ file, season: "", dataset: dir, source: "manual", notes: "" });
      }
    }
  }
  for (const file of inboxFiles()) {
    if (!known.has(file)) rows.push({ file, season: "", dataset: "real", source: "manual", notes: "" });
  }
  return rows;
}

function readBody(req: import("http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(path.join(EVAL_DIR, "label.html")));
    return;
  }

  if (url.pathname === "/rows") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(currentRows()));
    return;
  }

  if (url.pathname === "/image") {
    const file = url.searchParams.get("file") ?? "";
    // Pin to the known directories: this parameter becomes a filesystem path.
    if (!/^(real|synthetic|inbox)\/[\w.\- ]+\.(jpe?g|png|webp)$/i.test(file)) {
      res.writeHead(400).end("bad file");
      return;
    }
    const absolute = imagePath({ file } as LabelRow);
    if (!fs.existsSync(absolute)) {
      res.writeHead(404).end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[path.extname(absolute).toLowerCase()] ?? "application/octet-stream" });
    res.end(fs.readFileSync(absolute));
    return;
  }

  if (url.pathname === "/label" && req.method === "POST") {
    const incoming = JSON.parse(await readBody(req)) as LabelRow;
    const rows = readLabels().filter((r) => r.file !== incoming.file);
    rows.push({ ...incoming, source: "manual" });
    rows.sort((a, b) => a.file.localeCompare(b.file, undefined, { numeric: true }));
    writeLabels(rows);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n  labelling on http://localhost:${PORT}`);
  console.log(`  writes ${path.relative(process.cwd(), path.join(EVAL_DIR, "labels.csv"))}\n`);
});
