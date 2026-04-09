import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, Event } from "@/types/vmdi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenant_id = searchParams.get("tenant_id");
    const asset_id = searchParams.get("asset_id");
    const campaign_id = searchParams.get("campaign_id");

    if (!tenant_id) {
      return NextResponse.json(
        { data: null, error: "tenant_id is required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    let query = supabase
      .from("events")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false });

    if (asset_id) query = query.eq("asset_id", asset_id);
    if (campaign_id) query = query.eq("campaign_id", campaign_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: { total: data.length } } satisfies ApiResponse<Event[]>,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
