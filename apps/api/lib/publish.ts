import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PublishableAsset {
  assetId: string;
  title: string;
  body: string;
  excerpt: string;
  slug: string;
  keyword_primary: string;
  keywords_secondary: string[];
  author: { name: string };
  schema_json: object | null;
  published_at: string;
}

interface AdapterResult {
  success: boolean;
  publishedUrl: string | null;
  error: string | null;
  adapter: string;
}

export interface PublishResult extends AdapterResult {
  channelId: string;
  channelType: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

async function publishToWebhook(
  asset: PublishableAsset,
  webhookUrl: string,
  adapterName: string,
  baseUrl: string
): Promise<AdapterResult> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: asset.slug,
      title: asset.title,
      body: asset.body,
      excerpt: asset.excerpt,
      meta_title: truncate(asset.title, 60),
      meta_description: truncate(asset.excerpt, 160),
      keywords: [asset.keyword_primary, ...asset.keywords_secondary],
      author: asset.author.name,
      published_at: asset.published_at,
      schema: asset.schema_json,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    return {
      success: false,
      publishedUrl: null,
      error: `Webhook returned ${response.status}: ${errorText}`,
      adapter: adapterName,
    };
  }

  return {
    success: true,
    publishedUrl: `${baseUrl}/${asset.slug}`,
    error: null,
    adapter: adapterName,
  };
}

const ADAPTER_CONFIG: Record<string, { envKey: string; baseUrl: string }> = {
  vaeo_blog: {
    envKey: "VAEO_BLOG_WEBHOOK_URL",
    baseUrl: "https://velocityaeo.com/blog",
  },
  vmdi_blog: {
    envKey: "VMDI_BLOG_WEBHOOK_URL",
    baseUrl: "https://vmdi.com/blog",
  },
};

async function callAdapter(
  channelType: string,
  asset: PublishableAsset
): Promise<AdapterResult> {
  const config = ADAPTER_CONFIG[channelType];

  if (!config) {
    const available = Object.keys(ADAPTER_CONFIG).join(", ");
    return {
      success: false,
      publishedUrl: null,
      error: `Unknown channel type "${channelType}". Available: ${available}`,
      adapter: channelType,
    };
  }

  const webhookUrl = process.env[config.envKey];
  if (!webhookUrl) {
    console.warn(`[${channelType}] ${config.envKey} not configured`);
    return {
      success: false,
      publishedUrl: null,
      error: `${config.envKey} not configured`,
      adapter: channelType,
    };
  }

  return publishToWebhook(asset, webhookUrl, channelType, config.baseUrl);
}

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
      const adapterResult = await callAdapter(channel.type, publishable);

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
