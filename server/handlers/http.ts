/**
 * Small helpers shared by the web-standard handlers.
 *
 * Every route is a `(request: Request) => Promise<Response>`, which is what
 * Vercel Functions take directly and what the local Express server adapts to.
 * One implementation, two runtimes — the alternative was writing each route
 * twice and watching them drift.
 */

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const fail = (status: number, error: string, message: string): Response =>
  json({ error, message }, status);

export const methodNotAllowed = (allowed: string): Response =>
  new Response(JSON.stringify({ error: "method_not_allowed", message: `Use ${allowed}` }), {
    status: 405,
    headers: { "content-type": "application/json", allow: allowed },
  });

/**
 * Map a thrown provider error onto a status the client can act on.
 *
 * Shared so every route reports a rate limit or a billing problem the same way,
 * rather than each one string-matching its own way to a 500.
 */
export function providerErrorResponse(err: unknown, fallbackError: string): Response {
  const message = err instanceof Error ? err.message : String(err);

  if (/429|too many requests|quota/i.test(message)) {
    return fail(
      429,
      "rate_limited",
      "The AI service is temporarily busy (rate limit reached). Please wait a minute and try again."
    );
  }
  if (/credit balance|billing|402/i.test(message)) {
    return fail(
      502,
      "ai_provider_error",
      "The AI service rejected the request. Please try again later."
    );
  }
  if (/JSON|position/i.test(message)) {
    return fail(
      502,
      "ai_incomplete_response",
      "The AI returned an incomplete response. Please try again — this usually works on the second attempt."
    );
  }
  return fail(500, fallbackError, message);
}

/**
 * Read an uploaded file from multipart form data.
 *
 * Bytes are returned in memory and never written anywhere. Nothing in this
 * codebase may log them — see the note in CLAUDE.md.
 */
export async function readUpload(
  form: FormData,
  field: string
): Promise<{ bytes: Uint8Array; type: string } | null> {
  const value = form.get(field);
  if (!value || typeof value === "string") return null;
  const file = value as File;
  return { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type };
}
