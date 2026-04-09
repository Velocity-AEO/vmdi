import { createClient } from "@supabase/supabase-js";
import { runContentPipeline } from "../content-pipeline.js";
import type { PlanItem } from "./types.js";

export type { ExecutePlanItemResult } from "./types.js";

interface GeneratedArticle {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
}

/** Function signature matching b-campaign-orchestration's generateArticle */
type ArticleGenerator = (input: {
  topic?: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetWordCount: number;
  tone: "professional" | "conversational" | "educational";
  authorName: string;
  existingAssetTitles: string[];
}) => Promise<GeneratedArticle>;

function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function executePlanItem(
  planItem: PlanItem,
  tenantId: string,
  authorId: string,
  generateArticle: ArticleGenerator
): Promise<{ assetId: string }> {
  const supabase = createSupabaseClient();
  const brief = planItem.brief;

  // Fetch existing asset titles for deduplication
  const { data: existingAssets } = await supabase
    .from("assets")
    .select("title")
    .eq("tenant_id", tenantId)
    .eq("status", "published");

  const existingTitles = (existingAssets ?? []).map(
    (a: { title: string }) => a.title
  );

  // Fetch author name
  const { data: author } = await supabase
    .from("authors")
    .select("name")
    .eq("author_id", authorId)
    .single<{ name: string }>();

  const authorName = author?.name ?? "VAEO";

  // Step 1: Generate article from brief
  const generated = await generateArticle({
    topic: `${brief.title}\n\nAngle: ${brief.angle}\n\nTarget audience: ${brief.targetAudience}\n\nMust include: ${brief.mustInclude.join(", ")}\n\nMust avoid: ${brief.mustAvoid.join(", ")}\n\nSuggested H2s: ${brief.suggestedH2s.join(", ")}`,
    primaryKeyword: brief.keyword,
    secondaryKeywords: [],
    targetWordCount: brief.recommendedWordCount,
    tone: brief.tone,
    authorName,
    existingAssetTitles: existingTitles,
  });

  // Step 2: Run content pipeline (humanize → AI detect → keyword enforce → schema)
  const pipelineResult = await runContentPipeline({
    rawContent: generated.body,
    primaryKeyword: brief.keyword,
    secondaryKeywords: [],
    tone: brief.tone,
    author: { name: authorName },
    url: `https://velocityaeo.com/blog/${generated.slug}`,
    existingAssets: existingTitles,
  });

  if (!pipelineResult.success) {
    throw new Error(
      `Content pipeline failed for "${brief.title}": ${pipelineResult.issues.join("; ")}`
    );
  }

  // Step 3: Fetch keyword_id for this keyword
  const { data: kwRow } = await supabase
    .from("keywords")
    .select("keyword_id")
    .eq("tenant_id", tenantId)
    .eq("keyword_primary", brief.keyword)
    .limit(1)
    .single<{ keyword_id: string }>();

  // Step 4: Create asset in Supabase
  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      tenant_id: tenantId,
      author_id: authorId,
      keyword_id: kwRow?.keyword_id ?? null,
      type: "article" as const,
      status: "draft" as const,
      title: generated.title,
      body: pipelineResult.content,
      excerpt: generated.excerpt,
      keyword_primary: brief.keyword,
      slug: generated.slug,
      uniqueness_score: pipelineResult.uniquenessScore,
      schema_json: pipelineResult.schema,
      legal_owner: "VAEO",
      license_type: "proprietary",
    })
    .select("asset_id")
    .single<{ asset_id: string }>();

  if (error || !asset) {
    throw new Error(
      `Failed to create asset for "${brief.title}": ${error?.message ?? "No data returned"}`
    );
  }

  // Step 5: Log event
  await supabase.from("events").insert({
    tenant_id: tenantId,
    asset_id: asset.asset_id,
    event_type: "asset.created_from_plan",
    actor: "content-planner",
    result: "success",
    metadata: {
      brief_id: brief.briefId,
      gap_type: planItem.gap.gapType,
      keyword: brief.keyword,
      week: planItem.week,
      ai_detection_score: pipelineResult.aiDetectionScore,
      uniqueness_score: pipelineResult.uniquenessScore,
    },
  });

  return { assetId: asset.asset_id };
}
