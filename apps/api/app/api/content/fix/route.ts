import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types/vmdi";
import { rewriteContent } from "@/lib/ai-detection";

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

    const result = await rewriteContent(content);

    return NextResponse.json(
      {
        data: {
          fixedContent: result.content,
          newScore: result.finalScore,
          attempts: result.attempts,
          history: result.history,
        },
        error: null,
        meta: null,
      } satisfies ApiResponse,
      { status: 200 }
    );
  } catch (err) {
    console.error("Content fix failed:", err);
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
