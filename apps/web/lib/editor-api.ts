const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface AISignal {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
}

export interface AIDetectionResult {
  score: number;
  confidence: "low" | "medium" | "high";
  verdict: "human" | "likely_human" | "likely_ai" | "ai";
  signals: AISignal[];
  passesThreshold: boolean;
  patternScore: number;
}

export interface ReadabilityResult {
  fleschKincaidGrade: number;
  avgSentenceLength: number;
  passiveVoiceRatio: number;
  firstPersonCount: number;
  contractionCount: number;
  sentenceLengthVariance: number;
}

export interface ContentCheckResponse {
  detection: AIDetectionResult;
  readability: ReadabilityResult;
}

export interface ContentFixResponse {
  fixedContent: string;
  newScore: number;
  attempts: number;
  history: { attempt: number; score: number; signals: string[] }[];
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function recheckContent(
  assetId: string,
  content: string
): Promise<ContentCheckResponse> {
  return post<ContentCheckResponse>("/api/content/check", {
    asset_id: assetId,
    content,
  });
}

export async function autoFixContent(
  assetId: string,
  content: string
): Promise<ContentFixResponse> {
  return post<ContentFixResponse>("/api/content/fix", {
    asset_id: assetId,
    content,
  });
}

export async function saveArticleBody(
  assetId: string,
  body: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/assets/${assetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
}
