const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  // Assets
  getAssets: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ data: import("./types").Asset[]; total: number }>(
      `/api/assets${qs}`
    );
  },
  getAsset: (id: string) =>
    request<import("./types").Asset>(`/api/assets/${id}`),
  createAsset: (body: Record<string, unknown>) =>
    request<import("./types").Asset>("/api/assets", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateAssetStatus: (id: string, status: string) =>
    request<import("./types").Asset>(`/api/assets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // Keywords
  getKeywords: () =>
    request<{ data: import("./types").Keyword[] }>("/api/keywords"),
  createKeyword: (body: Record<string, string>) =>
    request<import("./types").Keyword>("/api/keywords", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Authors
  getAuthors: () =>
    request<{ data: import("./types").Author[] }>("/api/authors"),

  // Events
  getEvents: (assetId: string) =>
    request<{ data: import("./types").AssetEvent[] }>(
      `/api/events?asset_id=${assetId}`
    ),

  // Plans
  getPlans: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ data: import("./types").ContentPlan[] }>(
      `/api/plans${qs}`
    );
  },
  getPlan: (id: string) =>
    request<{ data: import("./types").ContentPlan }>(`/api/plans/${id}`),
  generatePlan: (body: { tenantId: string; month: string }) =>
    request<{ data: import("./types").ContentPlan }>("/api/plans", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  executePlanItem: (planId: string, body: { planItemIndex: number; authorId: string }) =>
    request<{ data: { assetId: string; title: string; body: string; keyword: string } }>(
      `/api/plans/${planId}/execute`,
      { method: "POST", body: JSON.stringify(body) }
    ),

  // Briefs
  getBriefs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ data: import("./types").ContentBrief[] }>(
      `/api/briefs${qs}`
    );
  },
};
