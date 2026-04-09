import type { PublishableAsset, AdapterResult } from "./types.js";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export async function publishToVAEOBlog(
  asset: PublishableAsset
): Promise<AdapterResult> {
  const webhookUrl = process.env.VAEO_BLOG_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[vaeo-blog-adapter] VAEO_BLOG_WEBHOOK_URL not configured");
    return {
      success: false,
      publishedUrl: null,
      error: "VAEO_BLOG_WEBHOOK_URL not configured",
      adapter: "vaeo_blog",
    };
  }

  try {
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
        adapter: "vaeo_blog",
      };
    }

    return {
      success: true,
      publishedUrl: `https://velocityaeo.com/blog/${asset.slug}`,
      error: null,
      adapter: "vaeo_blog",
    };
  } catch (err) {
    return {
      success: false,
      publishedUrl: null,
      error: err instanceof Error ? err.message : String(err),
      adapter: "vaeo_blog",
    };
  }
}
