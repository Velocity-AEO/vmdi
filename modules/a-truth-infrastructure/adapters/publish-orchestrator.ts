import { createClient } from "@supabase/supabase-js";
import { getAdapter } from "./adapter-registry.js";
import type { PublishableAsset, PublishResult } from "./types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AssetRow {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  body: string | null;
  summary: string | null;
  keyword_primary: string;
  keywords_secondary: string[];
  author_id: string;
  campaign_id: string | null;
  published_at: string | null;
  authors: { name: string } | null;
}

interface ChannelRow {
  id: string;
  type: string;
  name: string;
}

export async function publishAsset(
  assetId: string,
  channelIds: string[]
): Promise<PublishResult[]> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("*, authors(name)")
    .eq("id", assetId)
    .single<AssetRow>();

  if (assetError || !asset) {
    throw new Error(`Asset ${assetId} not found: ${assetError?.message ?? "no data"}`);
  }

  const { data: channels, error: channelError } = await supabase
    .from("channels")
    .select("id, type, name")
    .in("id", channelIds);

  if (channelError || !channels) {
    throw new Error(`Failed to fetch channels: ${channelError?.message ?? "no data"}`);
  }

  const now = new Date().toISOString();

  const publishable: PublishableAsset = {
    assetId: asset.id,
    title: asset.title,
    body: asset.body ?? "",
    excerpt: asset.summary ?? "",
    slug: asset.slug,
    keyword_primary: asset.keyword_primary,
    keywords_secondary: asset.keywords_secondary ?? [],
    author: { name: asset.authors?.name ?? "VAEO Team" },
    schema_json: null,
    published_at: asset.published_at ?? now,
  };

  const results: PublishResult[] = [];
  const publishedUrls: string[] = [];

  for (const channel of channels as ChannelRow[]) {
    let result: PublishResult;

    try {
      const adapter = getAdapter(channel.type);
      const adapterResult = await adapter.publish(publishable);

      result = {
        ...adapterResult,
        channelId: channel.id,
        channelType: channel.type,
      };

      if (adapterResult.success && adapterResult.publishedUrl) {
        publishedUrls.push(adapterResult.publishedUrl);
      }
    } catch (err) {
      result = {
        success: false,
        publishedUrl: null,
        error: err instanceof Error ? err.message : String(err),
        adapter: channel.type,
        channelId: channel.id,
        channelType: channel.type,
      };
    }

    await supabase.from("events").insert({
      tenant_id: asset.tenant_id,
      action: "asset.published",
      asset_id: assetId,
      campaign_id: asset.campaign_id,
      metadata: {
        channel_id: channel.id,
        channel_type: channel.type,
        channel_name: channel.name,
        success: result.success,
        published_url: result.publishedUrl,
        error: result.error,
      },
    });

    results.push(result);
  }

  if (publishedUrls.length > 0) {
    await supabase
      .from("assets")
      .update({
        status: "published",
        published_at: now,
        published_url: publishedUrls[0],
        updated_at: now,
      })
      .eq("id", assetId);
  }

  return results;
}
