import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types/vmdi";
import { detectAI } from "@/lib/ai-detection";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { data: null, error: "content (string) is required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const { detection, readability } = await detectAI(content);

    return NextResponse.json(
      {
        data: { detection, readability },
        error: null,
        meta: null,
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("Content check failed:", err);
    return NextResponse.json(
      {
        data: null,
        error: err instanceof Error ? err.message : "Internal server error",
        meta: null,
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
