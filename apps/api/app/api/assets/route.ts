import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Asset } from "@/types/vmdi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const tenant_id = searchParams.get("tenant_id");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let query = supabase
      .from("assets")
      .select("*", { count: "exact" })
      .neq("status", "rejected")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (type) query = query.eq("type", type);
    if (tenant_id) query = query.eq("tenant_id", tenant_id);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        error: null,
        meta: { total: count, limit, offset },
      } satisfies ApiResponse<Asset[]>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, keyword_primary, author_id, tenant_id } = body;

    if (!title || !keyword_primary || !author_id) {
      return NextResponse.json(
        {
          data: null,
          error: "title, keyword_primary, and author_id are required",
          meta: null,
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    if (!tenant_id) {
      return NextResponse.json(
        { data: null, error: "tenant_id is required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("assets")
      .insert({
        title,
        slug,
        body: body.body ?? null,
        summary: body.summary ?? null,
        type: body.type ?? "blog",
        status: "draft",
        version: 1,
        keyword_primary,
        keywords_secondary: body.keywords_secondary ?? [],
        author_id,
        tenant_id,
        campaign_id: body.campaign_id ?? null,
        channel_id: body.channel_id ?? null,
        meta_title: body.meta_title ?? null,
        meta_description: body.meta_description ?? null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    await logEvent({
      tenant_id,
      action: "asset.created",
      asset_id: data.id,
      campaign_id: body.campaign_id ?? null,
      metadata: { title, keyword_primary },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Asset>,
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
