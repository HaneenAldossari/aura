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

export async function listDemoSamples(): Promise<string[]> {
  const res = await fetch(`${BASE}/demo-list`);
  if (!res.ok) return [];
  const data = await safeJson(res);
  return Array.isArray(data.samples) ? data.samples : [];
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

export async function getResults(sessionId: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE}/results/${sessionId}`);
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.error || "Results not found");
  return data;
}

export async function sendChatMessage(
  sessionId: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages }),
  });

  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data.error || "Chat failed");
  }

  return data.response;
}

/**
 * Streaming chat. Calls onDelta with each text fragment as it arrives.
 * Returns the full response text. Falls back to the JSON endpoint if the
 * server doesn't stream (or errors before the stream starts).
 */
export async function streamChatMessage(
  sessionId: string,
  messages: ChatMessage[],
  onDelta: (fullText: string) => void
): Promise<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ sessionId, messages }),
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
  sessionId: string
): Promise<LinkCheckResultData> {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("sessionId", sessionId);

  const res = await fetch(`${BASE}/link-check-image`, {
    method: "POST",
    body: formData,
  });
  const data = await safeJson(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || "Image check failed");
  }
  return data;
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
  sessionId: string
): Promise<LinkCheckResultData> {
  const res = await fetch(`${BASE}/link-check-manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ colorDesc, category, brand, sessionId }),
  });
  const mdata = await safeJson(res);
  if (!res.ok) {
    throw new Error(mdata.message ?? "Manual check failed");
  }
  return mdata;
}

