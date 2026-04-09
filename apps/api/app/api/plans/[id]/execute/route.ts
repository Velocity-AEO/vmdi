import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import type { ApiResponse } from "@/types/vmdi";

interface PlanItemData {
  week: number;
  keyword: string;
  title: string;
  angle: string;
  targetAudience: string;
  wordCountTarget: number;
  tone: string;
  suggestedH2s: string[];
  mustInclude: string[];
  mustAvoid: string[];
  estimatedImpact: string;
  reasoning: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { planItemIndex, authorId } = body;

    if (planItemIndex === undefined || !authorId) {
      return NextResponse.json(
        { data: null, error: "planItemIndex and authorId are required", meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    // Fetch the plan
    const { data: plan, error: planError } = await supabase
      .from("content_plans")
      .select("*")
      .eq("plan_id", id)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { data: null, error: "Plan not found", meta: null } satisfies ApiResponse,
        { status: 404 }
      );
    }

    const planData = plan.plan_data as { items?: PlanItemData[] };
    const items = planData.items;

    if (!items || planItemIndex < 0 || planItemIndex >= items.length) {
      return NextResponse.json(
        { data: null, error: `Invalid planItemIndex: ${planItemIndex}`, meta: null } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const item = items[planItemIndex];

    // Fetch author name
    const { data: author } = await supabase
      .from("authors")
      .select("name")
      .eq("author_id", authorId)
      .single();

    const authorName = (author as { name: string } | null)?.name ?? "VAEO";

    // Generate article from brief using Claude
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `Write a full article based on this content brief:

TITLE: ${item.title}
PRIMARY KEYWORD: ${item.keyword}
ANGLE: ${item.angle}
TARGET AUDIENCE: ${item.targetAudience}
TARGET WORD COUNT: ${item.wordCountTarget}
TONE: ${item.tone}

SUGGESTED SUBHEADINGS:
${item.suggestedH2s.map((h: string) => `- ${h}`).join("\n")}

MUST INCLUDE:
${item.mustInclude.map((m: string) => `- ${m}`).join("\n")}

MUST AVOID:
${item.mustAvoid.map((m: string) => `- ${m}`).join("\n")}

RULES:
- Start with a markdown H1 title
- Use markdown H2 for subheadings
- Write in the specified tone
- Include the primary keyword in the title, first paragraph, and at least one subheading
- Use specific examples, numbers, and named tools/companies where relevant
- Vary sentence length
- Use contractions naturally
- Do not start with a generic definition
- Do not use: "delve", "furthermore", "it's worth noting", "in conclusion"
- Target the specified word count (within 15%)

Return ONLY the article in markdown format.`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const articleBody = block.text.trim();
    const titleMatch = articleBody.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : item.title;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Create asset
    const now = new Date().toISOString();
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        title,
        slug,
        body: articleBody,
        type: "article",
        status: "draft",
        version: 1,
        keyword_primary: item.keyword,
        keywords_secondary: [],
        author_id: authorId,
        tenant_id: plan.tenant_id,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { data: null, error: assetError?.message ?? "Failed to create asset", meta: null } satisfies ApiResponse,
        { status: 500 }
      );
    }

    // Also create a content_briefs record linked to the plan and asset
    await supabase.from("content_briefs").insert({
      tenant_id: plan.tenant_id,
      plan_id: id,
      asset_id: (asset as { id?: string; asset_id?: string }).id ?? (asset as { id?: string; asset_id?: string }).asset_id,
      keyword: item.keyword,
      title: item.title,
      angle: item.angle,
      target_audience: item.targetAudience,
      word_count_target: item.wordCountTarget,
      tone: item.tone,
      suggested_h2s: item.suggestedH2s,
      must_include: item.mustInclude,
      must_avoid: item.mustAvoid,
      estimated_impact: item.estimatedImpact,
      reasoning: item.reasoning,
      status: "executed",
    });

    await logEvent({
      tenant_id: plan.tenant_id,
      action: "plan.item_executed",
      asset_id: (asset as { id?: string; asset_id?: string }).id ?? (asset as { id?: string; asset_id?: string }).asset_id,
      metadata: {
        plan_id: id,
        plan_item_index: planItemIndex,
        keyword: item.keyword,
        author: authorName,
      },
    });

    return NextResponse.json(
      {
        data: {
          assetId: (asset as { id?: string; asset_id?: string }).id ?? (asset as { id?: string; asset_id?: string }).asset_id,
          title,
          body: articleBody,
          keyword: item.keyword,
        },
        error: null,
        meta: null,
      } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : "Internal server error", meta: null } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
