import type { ArticleGenResult, AssetMeta } from "./types.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";

interface CreatedAsset {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  body: string | null;
  summary: string | null;
  type: string;
  status: string;
  version: number;
  keyword_primary: string;
  keywords_secondary: string[];
  author_id: string;
  campaign_id: string | null;
  channel_id: string | null;
  published_at: string | null;
  published_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export async function createAssetFromGeneration(
  result: ArticleGenResult,
  meta: AssetMeta
): Promise<{ assetId: string; asset: CreatedAsset }> {
  const payload = {
    tenant_id: meta.tenantId,
    author_id: meta.authorId,
    title: result.title,
    slug: result.slug,
    body: result.body,
    summary: result.excerpt,
    type: "article" as const,
    keyword_primary: meta.keywordId,
    keywords_secondary: meta.channelIds,
    meta_title: result.title,
    meta_description: result.excerpt,
  };

  const response = await fetch(`${API_BASE_URL}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const errorMessage =
      (errorBody as { error?: string }).error || `HTTP ${response.status}`;
    throw new Error(`Failed to create asset: ${errorMessage}`);
  }

  const body = (await response.json()) as { data: CreatedAsset; error: string | null };

  if (body.error) {
    throw new Error(`API error: ${body.error}`);
  }

  return {
    assetId: body.data.id,
    asset: body.data,
  };
}
