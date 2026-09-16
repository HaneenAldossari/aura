/**
 * Before You Buy and the demo gallery.
 *
 * Stateless like chat: the shop check receives the analysis in the body and
 * validates it, rather than looking up a session.
 */

import fs from "fs";
import path from "path";
import { checkManualItem, checkShoppingImage } from "../services/linkChecker";
import { prepareImage } from "../utils/prepareImage";
import { maxFileSizeBytes } from "../utils/config";
import { normalizeResult } from "../normalizeResult";
import { validateAnalysisResult } from "./analysisResult";
import { fail, json, methodNotAllowed, providerErrorResponse, readUpload } from "./http";

const DEMO_DIR = path.join(__dirname, "../demo-analyses");

export async function handleLinkCheckImage(request: Request): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request", "Expected multipart form data.");
  }

  const upload = await readUpload(form, "photo");
  if (!upload) return fail(400, "bad_request", "No photo uploaded.");
  if (upload.bytes.byteLength > maxFileSizeBytes()) {
    return fail(413, "file_too_large", "That photo is too large.");
  }

  const rawAnalysis = form.get("analysis");
  if (typeof rawAnalysis !== "string") {
    return fail(400, "bad_request", "Missing analysis.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAnalysis);
  } catch {
    return fail(400, "invalid_analysis", "Analysis was not valid JSON.");
  }
  const validated = validateAnalysisResult(parsed);
  if (!validated.ok) {
    return fail(400, "invalid_analysis", `Analysis was rejected: ${validated.reason}`);
  }

  try {
    // Product photos come straight from a phone or a shop listing, so unlike the
    // analysis path these still go through the full sharp normalisation.
    const prepared = await prepareImage(Buffer.from(upload.bytes));
    const result = await checkShoppingImage(prepared.base64, prepared.mimeType, validated.result);
    return json(result);
  } catch (err) {
    console.error("Shop check failed:", err instanceof Error ? err.message : err);
    return providerErrorResponse(err, "link_check_failed");
  }
}

export async function handleLinkCheckManual(request: Request): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");

  let body: { colorDesc?: string; category?: string; brand?: string; analysis?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }

  if (typeof body.colorDesc !== "string" || body.colorDesc.trim() === "") {
    return fail(400, "bad_request", "colorDesc is required.");
  }
  const validated = validateAnalysisResult(body.analysis);
  if (!validated.ok) {
    return fail(400, "invalid_analysis", `Analysis was rejected: ${validated.reason}`);
  }

  try {
    const result = await checkManualItem(
      body.colorDesc,
      body.category ?? "",
      body.brand ?? "",
      validated.result
    );
    return json(result);
  } catch (err) {
    console.error("Manual check failed:", err instanceof Error ? err.message : err);
    return providerErrorResponse(err, "manual_check_failed");
  }
}

export async function handleDemoList(request: Request): Promise<Response> {
  if (request.method !== "GET") return methodNotAllowed("GET");
  try {
    if (!fs.existsSync(DEMO_DIR)) return json({ samples: [] });
    const samples = fs
      .readdirSync(DEMO_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return json({ samples });
  } catch {
    return json({ samples: [] });
  }
}

export async function handleDemoLoad(request: Request): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");

  let body: { sampleId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return fail(400, "bad_request", "Expected a JSON body.");
  }

  const sampleId = body.sampleId ?? "";
  // Pinned pattern, not a sanitiser: this value becomes a filename.
  if (!/^sample-[0-9]+$/.test(sampleId)) {
    return fail(400, "bad_request", "Unknown sample.");
  }

  try {
    const file = path.join(DEMO_DIR, `${sampleId}.json`);
    if (!fs.existsSync(file)) return fail(404, "not_found", "Sample not found.");
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return json({ result: normalizeResult(raw) });
  } catch (err) {
    console.error("Demo load failed:", err instanceof Error ? err.message : err);
    return fail(500, "demo_load_failed", "Could not load that sample.");
  }
}
