// Add to Doppler vmdi/dev_vmdi:
// VAEO_BLOG_WEBHOOK_URL=http://localhost:3000/api/blog/publish (for local dev)
// VMDI_BLOG_WEBHOOK_URL=http://localhost:3002/api/blog/publish (for local dev)

export interface PublishableAsset {
  assetId: string;
  title: string;
  body: string;
  excerpt: string;
  slug: string;
  keyword_primary: string;
  keywords_secondary: string[];
  author: { name: string; url?: string };
  schema_json: object | null;
  published_at: string;
}

export interface AdapterResult {
  success: boolean;
  publishedUrl: string | null;
  error: string | null;
  adapter: string;
}

export interface Adapter {
  publish(asset: PublishableAsset): Promise<AdapterResult>;
}

export interface PublishResult extends AdapterResult {
  channelId: string;
  channelType: string;
}
