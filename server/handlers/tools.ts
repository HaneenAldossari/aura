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
import { getSeasonMakeup } from "../utils/seasonMakeup";
import { getSeasonStyle, resolvePairings } from "../utils/seasonStyle";
import { getCanonicalPalette } from "../utils/seasonPalettes";

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
    // The season travels with the id so the gallery can label each face
    // without loading nine full analyses to read one field from each.
    const samples = fs
      .readdirSync(DEMO_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((id) => {
        try {
          const raw = JSON.parse(
            fs.readFileSync(path.join(DEMO_DIR, `${id}.json`), "utf8")
          ) as {
            season?: string;
            rules?: { primary?: string };
            agreement?: { agrees?: boolean; level?: string };
            qualityIssues?: string[];
          };

          // A card carries a season only where the measurement and the model
          // reached it independently, at PRIMARY level. `agreement.agrees` is
          // also true when the model lands on the rules' second choice, which
          // is a near miss rather than agreement, and a caption is a flat
          // assertion with no room to explain the difference.
          //
          // Anything short of that shows the face and a number. A model-only
          // label is never shown: that is how two deep-skinned faces came to be
          // captioned "Light Summer" and "Light Spring", which cannot be true
          // of either, since the light seasons are light by definition.
          //
          // Colour cast is deliberately not part of this test. It decides which
          // faces are fit to ship at all (scripts/vetDemoFaces.ts), not whether
          // a shipped face may be captioned — applying it here suppressed every
          // label on every face, which is a way of saying nothing rather than a
          // way of being careful.
          const agrees = raw.agreement?.level === "primary";
          const season = agrees ? (raw.season ?? "") : "";

          return {
            id,
            season,
            agrees,
            /** Flags the sample for review rather than hiding the disagreement. */
            needsReview: !agrees,
          };
        } catch {
          // A malformed fixture should cost its own label, not the gallery.
          return { id, season: "", agrees: false, needsReview: true };
        }
      });
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
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;

    // Files written by scripts/precomputeDemoAnalyses.ts are already the client
    // contract — they came out of normalizeResult on the way in. Running them
    // through it again silently strips the fields it *produces* rather than
    // copies: `looks` arrives resolved ({slot, name, hex}) and no longer
    // matches the raw shape validateLooks reads ({slot, shade}), so every look
    // is dropped, and `measured` is attached after normalisation so it is lost
    // outright. Older fixtures predate the pipeline and still need the pass.
    const alreadyNormalised = "palette" in raw && "colorDNA" in raw;
    const result = alreadyNormalised ? raw : normalizeResult(raw);

    // Canonical shade data is a pure function of the season, so it is looked
    // up on the way out rather than trusted from the file. A fixture written
    // before these fields existed still gets them, and correcting a hex in
    // seasonMakeup.ts or seasonStyle.ts reaches the demo samples immediately
    // instead of after a $0.09 regeneration run.
    const season = (result.season as string) ?? "";
    result.makeupShades = getSeasonMakeup(season);
    const style = getSeasonStyle(season);
    result.styleShades = style
      ? { ...style, pairings: resolvePairings(season, getCanonicalPalette(season)) }
      : null;

    return json({ result });
  } catch (err) {
    console.error("Demo load failed:", err instanceof Error ? err.message : err);
    return fail(500, "demo_load_failed", "Could not load that sample.");
  }
}
