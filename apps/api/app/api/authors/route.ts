import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, Author } from "@/types/vmdi";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const tenant_id = searchParams.get("tenant_id");

    let query = supabase
      .from("authors")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenant_id) query = query.eq("tenant_id", tenant_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: { total: data.length } } satisfies ApiResponse<Author[]>,
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
    const { name, email, tenant_id } = body;

    if (!name || !email || !tenant_id) {
      return NextResponse.json(
        {
          data: null,
          error: "name, email, and tenant_id are required",
          meta: null,
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("authors")
      .insert({
        tenant_id,
        name,
        email,
        bio: body.bio ?? null,
        avatar_url: body.avatar_url ?? null,
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
      action: "author.created",
      metadata: { name, email },
    });

    return NextResponse.json(
      { data, error: null, meta: null } satisfies ApiResponse<Author>,
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
