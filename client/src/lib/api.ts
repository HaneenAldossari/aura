import type {
  AnalysisResult,
  AnalyzeResponse,
  ChatMessage,
  LinkCheckResultData,
} from "./types";

// In dev, Vite proxies /api → backend. In prod, set VITE_API_BASE to the deployed backend URL.
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      res.ok ? "Invalid response from server" : `Server error (${res.status})`
    );
  }
}

/**
 * Upload for analysis.
 *
 * `imageBytes` is the canonical JPEG produced by measure/encode.ts — ICC
 * converted to sRGB, EXIF-uprighted, downscaled. The raw file is never sent:
 * the model has to see the same colours the measurement did, and on a Display P3
 * photo that difference is a 4-degree hue shift, enough to flip the undertone.
 */
export async function analyzeMeasured(
  imageBytes: Uint8Array,
  features: unknown
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append(
    "photos",
    new File([new Blob([imageBytes as BlobPart])], "photo.jpg", { type: "image/jpeg" })
  );
  formData.append("features", JSON.stringify(features));

  const res = await fetch(`${BASE}/analyze`, { method: "POST", body: formData });
  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data.message || data.error || "Analysis failed");
  }
  return data as AnalyzeResponse;
}

/**
 * Note on every call below: the API is stateless, so anything that needs the
 * analysis is handed the analysis. There is no session to look up.
 */

export async function analyzePhotos(files: File[]): Promise<AnalyzeResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append("photos", f));

  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    body: formData,
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data.message || data.error || "Analysis failed");
  }

  return data;
}

export interface DemoSample {
  id: string;
  /** The label to show: the agreed season, or the rules' primary. */
  season: string;
  /** True when measurement and model reached the same season independently. */
  agrees: boolean;
  /** Set when they did not — the label is the rules', and provisional. */
  needsReview: boolean;
}

export async function listDemoSamples(): Promise<DemoSample[]> {
  const res = await fetch(`${BASE}/demo-list`);
  if (!res.ok) return [];
  const data = await safeJson(res);
  if (!Array.isArray(data.samples)) return [];
  // Tolerate the old string[] shape, so a client ahead of the server still
  // renders a gallery — just without labels.
  return data.samples.map((s: unknown) =>
    typeof s === "string"
      ? { id: s, season: "", agrees: false, needsReview: true }
      : (s as DemoSample)
  );
}

export async function loadDemoSample(sampleId: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE}/demo-load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sampleId }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Demo load failed");
  return data;
}


export async function sendChatMessage(
  analysis: AnalysisResult,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ analysis, messages }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || data.error || "Chat failed");
  return data.response as string;
}

/**
 * Streaming chat. Calls onDelta with each text fragment as it arrives.
 * Returns the full response text. Falls back to the JSON endpoint if the
 * server doesn't stream (or errors before the stream starts).
 */
export async function streamChatMessage(
  analysis: AnalysisResult,
  messages: ChatMessage[],
  onDelta: (fullText: string) => void
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ analysis, messages }),
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data.message || data.error || "Chat failed");
  }

  // Server answered with plain JSON (demo mode or non-streaming path)
  if (!contentType.includes("text/event-stream")) {
    const data = await safeJson(res);
    onDelta(data.response);
    return data.response;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return full;
      try {
        const parsed = JSON.parse(payload) as { delta?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.delta) {
          full += parsed.delta;
          onDelta(full);
        }
      } catch (err) {
        if (err instanceof Error && err.message === "chat_unavailable") throw err;
        // ignore malformed frames
      }
    }
  }
  return full;
}

export async function checkLinkImage(
  file: File,
  analysis: AnalysisResult
): Promise<LinkCheckResultData> {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("analysis", JSON.stringify(analysis));

  const res = await fetch(`${BASE}/link-check-image`, { method: "POST", body: formData });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || data.error || "Check failed");
  return data as LinkCheckResultData;
}

export async function getCelebrityImage(name: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/celebrity-image/${encodeURIComponent(name)}`);
    if (!res.ok) return null;
    const data = await safeJson(res);
    return typeof data.url === "string" ? data.url : null;
  } catch {
    return null;
  }
}

export async function checkLinkManual(
  colorDesc: string,
  category: string,
  brand: string,
  analysis: AnalysisResult
): Promise<LinkCheckResultData> {
  const res = await fetch(`${BASE}/link-check-manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ colorDesc, category, brand, analysis }),
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message || data.error || "Manual check failed");
  return data as LinkCheckResultData;
}

