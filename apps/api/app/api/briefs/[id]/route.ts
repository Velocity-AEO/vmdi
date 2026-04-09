import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { ApiResponse, ContentBrief } from "@/types/vmdi";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("brief_id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { data: null, error: "Brief not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<ContentBrief>,
      { status: 200 }
    );
  } catch {
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
      .from("content_briefs")
      .select("*")
      .eq("brief_id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { data: null, error: "Brief not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    // Only allow updating specific fields
    const allowedFields = [
      "keyword", "title", "angle", "target_audience", "word_count_target",
      "tone", "suggested_h2s", "must_include", "must_avoid",
      "estimated_impact", "reasoning", "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { data: null, error: "No valid fields to update", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_briefs")
      .update(updates)
      .eq("brief_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<ContentBrief>,
      { status: 200 }
    );
  } catch {
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
      .from("content_briefs")
      .select("*")
      .eq("brief_id", id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { data: null, error: "Brief not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("content_briefs")
      .update({ status: "cancelled" })
      .eq("brief_id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<ContentBrief>,
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
