import type { PublishableAsset, AdapterResult } from "./types.js";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

export async function publishToVMDIBlog(
  asset: PublishableAsset
): Promise<AdapterResult> {
  const webhookUrl = process.env.VMDI_BLOG_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[vmdi-blog-adapter] VMDI_BLOG_WEBHOOK_URL not configured");
    return {
      success: false,
      publishedUrl: null,
      error: "VMDI_BLOG_WEBHOOK_URL not configured",
      adapter: "vmdi_blog",
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
        adapter: "vmdi_blog",
      };
    }

    return {
      success: true,
      publishedUrl: `https://vmdi.com/blog/${asset.slug}`,
      error: null,
      adapter: "vmdi_blog",
    };
  } catch (err) {
    return {
      success: false,
      publishedUrl: null,
      error: err instanceof Error ? err.message : String(err),
      adapter: "vmdi_blog",
    };
  }
}
