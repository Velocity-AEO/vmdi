import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types/vmdi";

export async function GET() {
  const response: ApiResponse<{ status: string; timestamp: string; version: string }> = {
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    },
    error: null,
    meta: null,
  };

  return NextResponse.json(response, { status: 200 });
}
