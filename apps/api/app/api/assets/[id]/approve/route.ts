import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Asset } from "@/types/vmdi";

export async function POST(
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

    if (existing.status !== "awaiting_approval") {
      return NextResponse.json(
        {
          data: null,
          error: `Cannot approve asset with status "${existing.status}". Must be "awaiting_approval".`,
          meta: null,
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("assets")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
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
      action: "asset.approved",
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
