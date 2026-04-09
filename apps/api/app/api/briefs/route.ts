import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, ContentBrief } from "@/types/vmdi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenant_id = searchParams.get("tenant_id");
    const status = searchParams.get("status");
    const plan_id = searchParams.get("plan_id");

    if (!tenant_id) {
      return NextResponse.json(
        { data: null, error: "tenant_id is required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    let query = supabase
      .from("content_briefs")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (plan_id) query = query.eq("plan_id", plan_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: { total: data.length } } satisfies ApiResponse<ContentBrief[]>,
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, keyword } = body;

    if (!tenant_id || !keyword) {
      return NextResponse.json(
        { data: null, error: "tenant_id and keyword are required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_briefs")
      .insert({
        tenant_id,
        keyword,
        title: body.title ?? null,
        angle: body.angle ?? null,
        target_audience: body.target_audience ?? null,
        word_count_target: body.word_count_target ?? null,
        tone: body.tone ?? null,
        suggested_h2s: body.suggested_h2s ?? [],
        must_include: body.must_include ?? [],
        must_avoid: body.must_avoid ?? [],
        estimated_impact: body.estimated_impact ?? null,
        reasoning: body.reasoning ?? null,
        status: "pending",
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
      action: "brief.created",
      metadata: { keyword, title: body.title },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<ContentBrief>,
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
