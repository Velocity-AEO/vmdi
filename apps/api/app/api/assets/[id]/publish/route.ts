import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Asset } from "@/types/vmdi";
import { publishAsset } from "@/lib/publish";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from("assets")
      .select("*, tenants(domain, slug)")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { data: null, error: "Asset not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    if (existing.status !== "approved") {
      return NextResponse.json(
        {
          data: null,
          error: `Cannot publish asset with status "${existing.status}". Must be "approved".`,
          meta: null,
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const tenant = existing.tenants as { domain: string | null; slug: string } | null;
    const domain = tenant?.domain ?? `${tenant?.slug ?? "vmdi"}.vaeo.co`;
    const publishedUrl = `https://${domain}/${existing.slug}`;

    const { data, error } = await supabase
      .from("assets")
      .update({
        status: "published",
        published_at: now,
        published_url: publishedUrl,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    await logEvent({
      tenant_id: existing.tenant_id,
      action: "asset.published",
      asset_id: id,
      campaign_id: existing.campaign_id,
      metadata: { published_url: publishedUrl },
    });

    // Publish to external channels via adapters
    let adapterResults: Awaited<ReturnType<typeof publishAsset>> = [];
    if (existing.channel_id) {
      try {
        adapterResults = await publishAsset(id, [existing.channel_id]);
      } catch (adapterErr) {
        console.error("Adapter publish failed:", adapterErr);
      }
    }

    // Also check request body for additional channel_ids
    try {
      const body = await request.json().catch(() => null);
      if (body?.channel_ids && Array.isArray(body.channel_ids)) {
        const extraIds = (body.channel_ids as string[]).filter(
          (cid: string) => cid !== existing.channel_id
        );
        if (extraIds.length > 0) {
          const extraResults = await publishAsset(id, extraIds);
          adapterResults = [...adapterResults, ...extraResults];
        }
      }
    } catch {
      // body parsing is optional
    }

    const publishedUrls = adapterResults
      .filter((r) => r.success && r.publishedUrl)
      .map((r) => ({ channel: r.channelType, url: r.publishedUrl }));

    return NextResponse.json(
      {
        data,
        error: null,
        meta: {
          published_url: publishedUrl,
          adapter_results: adapterResults,
          published_urls: publishedUrls,
        },
      } satisfies ApiResponse<Asset>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
