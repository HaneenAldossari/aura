/**
 * Local development server.
 *
 * Production runs the handlers in server/handlers/ as Vercel Functions under
 * api/. This is a thin Node http adapter over the *same* handlers so `npm run
 * dev` and the e2e exercise the real code rather than a parallel Express
 * implementation that could drift.
 *
 * Express, multer, helmet, cors and express-rate-limit are gone with the
 * migration. What each provided, and what replaces it:
 *
 *   express + multer   — the handlers are web-standard; request.formData()
 *                        parses multipart natively.
 *   helmet             — security headers are set by vercel.json in production.
 *   cors               — the API is same-origin under /api; this dev server
 *                        allows the Vite origin only, and nothing else.
 *   express-rate-limit — process-local counters are meaningless on serverless.
 *                        See the note in CLAUDE.md: the LLM routes are
 *                        currently unthrottled and that is a known gap.
 *
 * Image bytes are never written to disk and never logged.
 */
import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { handleAnalyze } from "./handlers/analyze";
import { handleCelebrityImage } from "./handlers/celebrityImage";
import { handleChat } from "./handlers/chat";
import { handleHealth } from "./handlers/health";
import {
  handleDemoList,
  handleDemoLoad,
  handleLinkCheckImage,
  handleLinkCheckManual,
} from "./handlers/tools";

type Handler = (request: Request) => Promise<Response>;

const ROUTES: Record<string, Handler> = {
  "/api/health": handleHealth,
  "/api/analyze": handleAnalyze,
  "/api/chat": handleChat,
  "/api/demo-list": handleDemoList,
  "/api/demo-load": handleDemoLoad,
  "/api/link-check-image": handleLinkCheckImage,
  "/api/link-check-manual": handleLinkCheckManual,
};

const PORT = Number(process.env.PORT) || 3001;

/** Origins allowed to call this dev server. Production is same-origin. */
function allowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  const extra = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ok =
    /^http:\/\/localhost:\d+$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
    extra.includes(origin);
  return ok ? origin : null;
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = `http://localhost:${PORT}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return new Request(url, { method: req.method, headers });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  return new Request(url, { method: req.method, headers, body });
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));

  if (!response.body) {
    res.end();
    return;
  }
  // Stream, so SSE chat arrives token by token rather than all at once.
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
    // @ts-expect-error flush exists when compression middleware is absent
    res.flush?.();
  }
  res.end();
}

const server = createServer(async (req, res) => {
  const origin = allowedOrigin(req.headers.origin as string | undefined);
  if (origin) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "origin");
    res.setHeader("access-control-allow-headers", "content-type, accept");
    res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  }
  if (req.method === "OPTIONS") {
    res.statusCode = origin ? 204 : 403;
    res.end();
    return;
  }

  const pathname = (req.url ?? "/").split("?")[0].replace(/\/$/, "") || "/";
  // One dynamic route; everything else is an exact match.
  const handler = pathname.startsWith("/api/celebrity-image/")
    ? handleCelebrityImage
    : ROUTES[pathname];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "not_found", message: `No route for ${pathname}` }));
    return;
  }

  try {
    send(res, await handler(await toRequest(req)));
  } catch (err) {
    // Never log the request body: it can contain a photo.
    console.error(`${pathname} failed:`, err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "internal_error", message: "Something went wrong." }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`  aura dev API on http://localhost:${PORT}/api`);
  console.log(`  routes: ${Object.keys(ROUTES).join(", ")}`);
});
