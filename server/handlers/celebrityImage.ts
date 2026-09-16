/**
 * GET /api/celebrity-image/:name
 *
 * Resolves a celebrity's Wikipedia thumbnail so the results page can show a face
 * instead of initials. Lost in the Vercel migration and restored here — the
 * client swallows the failure, so the only symptom was four 404s per results
 * page and cards silently falling back to initials.
 *
 * The original kept an in-memory Map keyed by name. That is pointless on
 * serverless, where each invocation may be a fresh instance, so caching moves to
 * the response headers and the CDN does the work instead.
 */

import { fail, json, methodNotAllowed } from "./http";

/** A day on the CDN, a week while revalidating: these images essentially never change. */
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** Names come from the model, not from user input, but this still builds a URL. */
const MAX_NAME_LENGTH = 80;
const SAFE_NAME = /^[\p{L}\p{M}][\p{L}\p{M}.'\-\s]*$/u;

export async function handleCelebrityImage(request: Request): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");

  const path = new URL(request.url).pathname;
  const raw = path.slice(path.lastIndexOf("/") + 1);
  let name: string;
  try {
    name = decodeURIComponent(raw).trim();
  } catch {
    return fail(400, "bad_request", "Invalid name.");
  }

  if (!name || name.length > MAX_NAME_LENGTH || !SAFE_NAME.test(name)) {
    return fail(400, "bad_request", "Invalid name.");
  }

  try {
    const page = encodeURIComponent(name.replace(/ /g, "_"));
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${page}`,
      { headers: { "User-Agent": "AuraColorAnalysis/2.0 (github.com/HaneenAldossari/aura)" } }
    );

    if (!response.ok) {
      // Cache the miss too: a name with no Wikipedia page will never gain one
      // during a deployment's life, and re-asking on every page view is waste.
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json", "cache-control": CACHE_CONTROL },
      });
    }

    const data = (await response.json()) as {
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
    };
    const url = data.thumbnail?.source ?? data.originalimage?.source ?? null;

    if (!url) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json", "cache-control": CACHE_CONTROL },
      });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": CACHE_CONTROL },
    });
  } catch (err) {
    console.error("Celebrity image lookup failed:", err instanceof Error ? err.message : err);
    return json({ error: "lookup_failed" }, 502);
  }
}
