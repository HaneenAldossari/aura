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

