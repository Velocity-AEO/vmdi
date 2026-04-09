import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Asset } from "@/types/vmdi";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: "Asset not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Asset>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: existing, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { data: null, error: "Asset not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      ...body,
      updated_at: new Date().toISOString(),
    };

    if (body.status === "published" && existing.status !== "published") {
      updates.published_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("assets")
      .update(updates)
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
      action: "asset.updated",
      asset_id: id,
      campaign_id: existing.campaign_id,
      metadata: { fields: Object.keys(body) },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Asset>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: existing, error: fetchError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { data: null, error: "Asset not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("assets")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
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
      action: "asset.rejected",
      asset_id: id,
      campaign_id: existing.campaign_id,
      metadata: { previous_status: existing.status },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Asset>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
