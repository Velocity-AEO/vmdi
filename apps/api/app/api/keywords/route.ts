import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Keyword } from "@/types/vmdi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenant_id = searchParams.get("tenant_id");

    if (!tenant_id) {
      return NextResponse.json(
        { data: null, error: "tenant_id is required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("keywords")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: { total: data.length } } satisfies ApiResponse<Keyword[]>,
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
    const { term, tenant_id } = body;

    if (!term || !tenant_id) {
      return NextResponse.json(
        { data: null, error: "term and tenant_id are required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("keywords")
      .insert({
        tenant_id,
        term,
        volume: body.volume ?? null,
        difficulty: body.difficulty ?? null,
        intent: body.intent ?? null,
        cluster: body.cluster ?? null,
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
      action: "keyword.created",
      metadata: { term },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Keyword>,
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
