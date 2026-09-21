/**
 * POST /api/analyze
 *
 * Takes the canonical image the browser produced plus the features it measured,
 * ranks the seasons from those features, asks the model to choose among the
 * top three (named alphabetically, unscored), and compares the two afterwards.
 * A model answer outside those three is overruled by the rules' primary.
 *
 * The response is self-sufficient: everything the UI, chat and the shop check
 * need is inside `result`. There is no session store — the client keeps the
 * result and sends it back when it needs it.
 *
 * Image bytes stay in memory and are never written to disk or logged.
 */

import { analyzePhotos } from "../services/vision";
import { DEMO_RESULT } from "../services/demoData";
import { isDemo } from "../services/openrouter";
import { prepareImage, validateImage } from "../utils/prepareImage";
import { analysisMode, maxFileSizeBytes } from "../utils/config";
import {
  candidateSeasons,
  computeAgreement,
  decideSeason,
  describeFeatures,
  rankSeasons,
  validateFeatures,
} from "../services/hybrid";
import { normalizeResult } from "../normalizeResult";
import { fail, json, methodNotAllowed, providerErrorResponse, readUpload } from "./http";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function handleAnalyze(request: Request): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed("POST");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request", "Expected multipart form data.");
  }

  const upload = await readUpload(form, "photos");
  if (!upload) return fail(400, "no_photos", "No photos uploaded");

  if (upload.bytes.byteLength > maxFileSizeBytes()) {
    return fail(413, "file_too_large", "That photo is too large. Please use a smaller file.");
  }
  if (upload.type && !ALLOWED_TYPES.includes(upload.type)) {
    return fail(400, "invalid_file_type", "Only JPG, PNG and WebP images are accepted.");
  }

  // Measured features, when the browser ran measure/. Untrusted input steering a
  // paid model call, so ranges are checked rather than assumed.
  let measured: ReturnType<typeof validateFeatures> | null = null;
  const rawFeatures = form.get("features");
  if (typeof rawFeatures === "string" && rawFeatures.length > 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFeatures);
    } catch {
      return fail(400, "invalid_features", "Measured features were not valid JSON.");
    }
    measured = validateFeatures(parsed);
    if (!measured.ok) {
      return fail(400, "invalid_features", `Measured features were rejected: ${measured.reason}`);
    }
  }

  const hybrid = analysisMode() === "hybrid" && measured?.ok === true;

  if (isDemo()) {
    return json({ result: { ...DEMO_RESULT } });
  }

  try {
    const buffer = Buffer.from(upload.bytes);

    // The browser already produced the canonical image — ICC-converted,
    // uprighted, downscaled. Re-encoding would be a second lossy pass over the
    // exact pixels that were measured, and the model has to see those.
    let prepared;
    try {
      if (hybrid) {
        const checked = await validateImage(buffer);
        prepared = checked.withinCap
          ? {
              base64: buffer.toString("base64"),
              mimeType: `image/${checked.format}` as "image/jpeg",
              width: checked.width,
              height: checked.height,
            }
          : await prepareImage(buffer);
      } else {
        prepared = await prepareImage(buffer);
      }
    } catch {
      return fail(
        400,
        "invalid_image",
        "That file doesn't look like a valid photo. Please upload a JPG, PNG, or WebP image."
      );
    }

    // Rank from the measurements. The model is told the top three — which
    // three, alphabetically, never which one leads or by how much — and must
    // choose among them. The measurement bounds the answer; the image settles it.
    const rules = hybrid && measured?.ok ? rankSeasons(measured.features) : null;
    const analyzeOptions =
      rules && measured?.ok
        ? {
            measurements: describeFeatures(measured.features, rules.axes),
            candidates: candidateSeasons(rules),
          }
        : {};

    let raw = await analyzePhotos(
      [{ base64: prepared.base64, mimeType: prepared.mimeType }],
      analyzeOptions
    );

    // A false no_face on a valid photo is cheap to retry once.
    if (raw.error === "no_face") {
      raw = await analyzePhotos(
        [{ base64: prepared.base64, mimeType: prepared.mimeType }],
        analyzeOptions
      );
    }

    if (raw.error === "no_face" || raw.error === "multiple_faces") {
      const messages: Record<string, string> = {
        no_face: "No face detected. Please upload a clear photo showing your face.",
        multiple_faces: "Multiple faces detected. Please upload a photo of just one person.",
      };
      return fail(400, raw.error as string, messages[raw.error as string]);
    }
    if (raw.error) {
      // low_confidence keeps its 200 so the client can show photo tips; moving
      // it to a non-2xx status silently drops them.
      return json({ result: raw });
    }

    // The model's season stands only if it is one of the candidates. Otherwise
    // the rules' primary is the answer, confidence is capped, and the mismatch
    // is logged with the numbers that produced it — never the image.
    let overruled: string | null = null;
    if (rules && measured?.ok) {
      const decision = decideSeason(rules, raw.primarySeason ?? raw.season);
      if (decision.source === "rules") {
        overruled = decision.rejected ?? "(none)";
        console.warn(
          "[classify] model answered outside the candidates — using the rules' primary",
          JSON.stringify({
            model: overruled,
            candidates: candidateSeasons(rules),
            used: decision.season,
            margin: rules.margin,
            skinBand: rules.skinBand,
            axes: {
              hue: rules.axes.hue.value,
              value: rules.axes.value.value,
              chroma: rules.axes.chroma.value,
            },
            skin: measured.features.skin,
            hair: measured.features.hair,
            eyes: measured.features.eyes,
            hairStatus: measured.features.hairStatus,
          })
        );
        raw = { ...raw, primarySeason: decision.season, season: decision.season };
      }
    }

    let result = normalizeResult(raw);

    if (rules && measured?.ok) {
      const agreement = computeAgreement(rules, overruled ?? result.season);
      const confidence = result.confidence as number;
      result = {
        ...result,
        confidence: Math.min(confidence, agreement.confidenceCap * 100),
        measured: {
          skin: measured.features.skin,
          hair: measured.features.hair,
          eyes: measured.features.eyes,
          hairStatus: measured.features.hairStatus,
          axes: rules.axes,
          contrast: rules.contrast,
          skinBand: rules.skinBand,
        },
        hairAvailable: measured.features.hair !== null,
        rules: {
          primary: agreement.rulesPrimary,
          secondary: agreement.rulesSecondary,
          margin: agreement.rulesMargin,
          ambiguous: rules.ambiguous,
        },
        agreement: { level: agreement.level, agrees: agreement.agrees },
        // Who chose the season on screen. "rules" means the model was overruled.
        seasonSource: overruled ? "rules" : "model",
        // A suggestion, never a gate, until Phase 4 calibrates the thresholds.
        needsSecondPhoto: agreement.needsSecondPhoto,
        alternatives: agreement.alternatives,
        crossValidation: {
          agrees: agreement.agrees,
          confidence: Math.min(confidence, agreement.confidenceCap * 100),
        },
      };
    }

    return json({ result });
  } catch (err) {
    // Never log the request body: it contains the photo.
    console.error("Analysis failed:", err instanceof Error ? err.message : err);
    return providerErrorResponse(err, "analysis_failed");
  }
}
