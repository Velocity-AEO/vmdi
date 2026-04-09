import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse, ContentPlan } from "@/types/vmdi";

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
      .from("content_plans")
      .select("*")
      .eq("tenant_id", tenant_id)
      .order("generated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message, meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data, error: null, meta: { total: data.length } } satisfies ApiResponse<ContentPlan[]>,
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
    const { tenantId, month } = body;

    if (!tenantId || !month) {
      return NextResponse.json(
        { data: null, error: "tenantId and month are required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    // Fetch keywords for plan context
    const { data: keywords } = await supabase
      .from("keywords")
      .select("keyword_primary, intent")
      .eq("tenant_id", tenantId);

    // Fetch published asset titles
    const { data: published } = await supabase
      .from("assets")
      .select("title, keyword_primary")
      .eq("tenant_id", tenantId)
      .eq("status", "published");

    const publishedTitles = (published ?? []).map((a: { title: string }) => a.title);
    const publishedKeywords = new Set(
      (published ?? []).map((a: { keyword_primary: string }) => a.keyword_primary?.toLowerCase()).filter(Boolean)
    );

    // Find content gaps (keywords with no published article)
    const contentGaps = (keywords ?? [])
      .filter((k: { keyword_primary: string }) => !publishedKeywords.has(k.keyword_primary.toLowerCase()))
      .map((k: { keyword_primary: string }) => k.keyword_primary);

    // Call Claude to generate the plan
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const keywordList = (keywords ?? []).length > 0
      ? (keywords ?? []).map((k: { keyword_primary: string; intent: string }) => `- "${k.keyword_primary}" (${k.intent ?? "informational"})`).join("\n")
      : "- No keywords defined yet";

    const publishedList = publishedTitles.length > 0
      ? publishedTitles.slice(0, 20).map((t: string) => `- ${t}`).join("\n")
      : "- No articles published yet";

    const gapList = contentGaps.length > 0
      ? contentGaps.map((g: string) => `- ${g}`).join("\n")
      : "- No content gaps identified";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: "You are a content strategist. Return only valid JSON, no markdown fences, no commentary.",
      messages: [
        {
          role: "user",
          content: `Generate a monthly content plan for ${month} for Velocity AEO.

EXISTING KEYWORDS:
${keywordList}

ALREADY PUBLISHED:
${publishedList}

CONTENT GAPS (keywords with no published article):
${gapList}

Generate exactly 4 content pieces (one per week). For each:
- week: 1-4
- keyword: primary keyword to target
- title: specific, compelling article title
- angle: unique angle (1-2 sentences)
- targetAudience: who this is for
- wordCountTarget: 800-2000
- tone: "professional" | "conversational" | "educational"
- suggestedH2s: 3-5 subheadings
- mustInclude: 2-3 things to cover
- mustAvoid: 1-2 things to avoid
- estimatedImpact: "high" | "medium" | "low"
- reasoning: why this matters (1-2 sentences)

Also include a "summary" field: 2-3 sentences explaining the monthly theme.

Return JSON: { "items": [...], "summary": "..." }`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type");
    }

    let planData: Record<string, unknown>;
    try {
      planData = JSON.parse(block.text);
    } catch {
      const match = block.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        planData = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse plan JSON");
      }
    }

    // Save to Supabase
    const { data: plan, error } = await supabase
      .from("content_plans")
      .insert({
        tenant_id: tenantId,
        month,
        plan_data: planData,
        generated_at: new Date().toISOString(),
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
      tenant_id: tenantId,
      action: "plan.generated",
      metadata: { month, item_count: (planData as { items?: unknown[] }).items?.length ?? 0 },
    });

    return NextResponse.json(
      { data: plan, error: null, meta: null } satisfies ApiResponse<ContentPlan>,
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
