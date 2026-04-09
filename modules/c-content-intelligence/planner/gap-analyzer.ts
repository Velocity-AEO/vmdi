import { createClient } from "@supabase/supabase-js";
import type { ContentGap } from "./types.js";

export type { ContentGap } from "./types.js";

interface KeywordRow {
  keyword_id: string;
  keyword_primary: string;
  keywords_secondary: string[];
  intent: string;
  cluster: string;
}

interface AssetRow {
  asset_id: string;
  keyword_id: string | null;
  keyword_primary: string | null;
  status: string;
  body: string | null;
  published_at: string | null;
  updated_at: string;
  title: string;
}

const GAP_PRIORITY_ORDER: Record<ContentGap["gapType"], number> = {
  missing: 0,
  cannibalizing: 1,
  thin: 2,
  outdated: 3,
};

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function analyzeContentGaps(
  tenantId: string
): Promise<ContentGap[]> {
  const supabase = createSupabaseClient();
  const gaps: ContentGap[] = [];

  // Fetch all keywords for tenant
  const { data: keywords, error: kwError } = await supabase
    .from("keywords")
    .select("keyword_id, keyword_primary, keywords_secondary, intent, cluster")
    .eq("tenant_id", tenantId)
    .returns<KeywordRow[]>();

  if (kwError) throw new Error(`Failed to fetch keywords: ${kwError.message}`);
  if (!keywords || keywords.length === 0) return [];

  // Fetch all published or draft assets for tenant
  const { data: assets, error: assetError } = await supabase
    .from("assets")
    .select("asset_id, keyword_id, keyword_primary, status, body, published_at, updated_at, title")
    .eq("tenant_id", tenantId)
    .in("status", ["published", "draft", "approved"])
    .returns<AssetRow[]>();

  if (assetError) throw new Error(`Failed to fetch assets: ${assetError.message}`);

  const allAssets = assets ?? [];
  const now = Date.now();

  // Build maps for analysis
  const publishedByKeywordId = new Map<string, AssetRow[]>();
  const publishedByKeywordPrimary = new Map<string, AssetRow[]>();

  for (const asset of allAssets) {
    if (asset.status !== "published") continue;

    if (asset.keyword_id) {
      const list = publishedByKeywordId.get(asset.keyword_id) ?? [];
      list.push(asset);
      publishedByKeywordId.set(asset.keyword_id, list);
    }

    if (asset.keyword_primary) {
      const kp = asset.keyword_primary.toLowerCase().trim();
      const list = publishedByKeywordPrimary.get(kp) ?? [];
      list.push(asset);
      publishedByKeywordPrimary.set(kp, list);
    }
  }

  for (const kw of keywords) {
    const matchedById = publishedByKeywordId.get(kw.keyword_id) ?? [];
    const matchedByText = publishedByKeywordPrimary.get(kw.keyword_primary.toLowerCase().trim()) ?? [];

    // Deduplicate
    const seenIds = new Set<string>();
    const published: AssetRow[] = [];
    for (const a of [...matchedById, ...matchedByText]) {
      if (!seenIds.has(a.asset_id)) {
        seenIds.add(a.asset_id);
        published.push(a);
      }
    }

    const assetIds = published.map((a) => a.asset_id);

    // MISSING: keyword has zero published assets
    if (published.length === 0) {
      gaps.push({
        keyword: kw.keyword_primary,
        keywordId: kw.keyword_id,
        intent: kw.intent ?? "informational",
        cluster: kw.cluster ?? "",
        gapType: "missing",
        priority: "high",
        reason: `No published content targeting "${kw.keyword_primary}". This keyword is in the bank but has zero coverage.`,
        existingAssetIds: [],
      });
      continue;
    }

    // CANNIBALIZING: 2+ published assets share the same keyword_primary
    if (published.length >= 2) {
      gaps.push({
        keyword: kw.keyword_primary,
        keywordId: kw.keyword_id,
        intent: kw.intent ?? "informational",
        cluster: kw.cluster ?? "",
        gapType: "cannibalizing",
        priority: "high",
        reason: `${published.length} published assets compete for "${kw.keyword_primary}": ${published.map((a) => `"${a.title}"`).join(", ")}. These may be cannibalizing each other in search results.`,
        existingAssetIds: assetIds,
      });
    }

    // Check each published asset for thin/outdated
    for (const asset of published) {
      // THIN: body word count < 800
      const wc = wordCount(asset.body);
      if (wc < 800) {
        gaps.push({
          keyword: kw.keyword_primary,
          keywordId: kw.keyword_id,
          intent: kw.intent ?? "informational",
          cluster: kw.cluster ?? "",
          gapType: "thin",
          priority: "medium",
          reason: `"${asset.title}" has only ${wc} words (minimum: 800). Thin content underperforms in search and may be seen as low-quality.`,
          existingAssetIds: [asset.asset_id],
        });
      }

      // OUTDATED: published_at > 6 months ago and no recent update
      if (asset.published_at) {
        const publishedMs = new Date(asset.published_at).getTime();
        const updatedMs = new Date(asset.updated_at).getTime();
        const stale = now - publishedMs > SIX_MONTHS_MS;
        const notUpdatedSince = now - updatedMs > SIX_MONTHS_MS;

        if (stale && notUpdatedSince) {
          const monthsAgo = Math.floor((now - publishedMs) / (30 * 24 * 60 * 60 * 1000));
          gaps.push({
            keyword: kw.keyword_primary,
            keywordId: kw.keyword_id,
            intent: kw.intent ?? "informational",
            cluster: kw.cluster ?? "",
            gapType: "outdated",
            priority: "low",
            reason: `"${asset.title}" was published ${monthsAgo} months ago with no updates. Search engines favor fresh content.`,
            existingAssetIds: [asset.asset_id],
          });
        }
      }
    }
  }

  // Sort: missing first → cannibalizing → thin → outdated
  gaps.sort((a, b) => {
    const orderDiff = GAP_PRIORITY_ORDER[a.gapType] - GAP_PRIORITY_ORDER[b.gapType];
    if (orderDiff !== 0) return orderDiff;
    // Within same gap type, high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return gaps;
}
