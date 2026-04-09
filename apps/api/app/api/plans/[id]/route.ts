import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, ContentPlan } from "@/types/vmdi";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("content_plans")
      .select("*")
      .eq("plan_id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: "Plan not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<ContentPlan>,
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
