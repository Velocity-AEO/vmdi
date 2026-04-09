import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "./supabase.js";

export interface DigestArticle {
  title: string;
  url: string;
  score: number;
}

export interface DigestReport {
  period: { start: string; end: string };
  summary: string;
  publishedThisWeek: DigestArticle[];
  avgAIDetectionScore: number;
  avgUniquenessScore: number;
  topKeyword: string;
  contentGapCount: number;
  nextWeekRecommendations: string[];
}

export async function generateWeeklyDigest(
  tenantId: string
): Promise<DigestReport> {
  const supabase = getSupabase();

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const period = {
    start: weekAgo.toISOString().slice(0, 10),
    end: now.toISOString().slice(0, 10),
  };

  // Fetch articles published this week
  const { data: weekAssets } = await supabase
    .from("assets")
    .select(
      "asset_id, title, canonical_url, overall_score, uniqueness_score, keyword_primary, status"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .gte("published_at", weekAgo.toISOString())
    .lte("published_at", now.toISOString());

  const publishedThisWeek: DigestArticle[] = (weekAssets ?? []).map((a) => ({
    title: a.title,
    url: a.canonical_url ?? "",
    score: a.overall_score ?? 0,
  }));

  // Fetch AI detection events for this week's published assets
  const assetIds = (weekAssets ?? []).map((a) => a.asset_id);
  let avgAIDetectionScore = 0;

  if (assetIds.length > 0) {
    const { data: aiEvents } = await supabase
      .from("asset_performance")
      .select("value")
      .eq("tenant_id", tenantId)
      .eq("event_type", "ai_detection")
      .in("asset_id", assetIds);

    if (aiEvents && aiEvents.length > 0) {
      const sum = aiEvents.reduce((s, e) => s + (e.value ?? 0), 0);
      avgAIDetectionScore = parseFloat(
        (sum / aiEvents.length).toFixed(3)
      );
    }
  }

  // Average uniqueness score of this week's assets
  const uniquenessValues = (weekAssets ?? [])
    .map((a) => a.uniqueness_score)
    .filter((v): v is number => v !== null);
  const avgUniquenessScore =
    uniquenessValues.length > 0
      ? parseFloat(
          (
            uniquenessValues.reduce((s, v) => s + v, 0) /
            uniquenessValues.length
          ).toFixed(3)
        )
      : 0;

  // Top keyword this week
  const kwCounts = new Map<string, number>();
  for (const a of weekAssets ?? []) {
    if (a.keyword_primary) {
      kwCounts.set(
        a.keyword_primary,
        (kwCounts.get(a.keyword_primary) ?? 0) + 1
      );
    }
  }
  let topKeyword = "";
  let topKwCount = 0;
  for (const [kw, count] of kwCounts) {
    if (count > topKwCount) {
      topKeyword = kw;
      topKwCount = count;
    }
  }

  // Content gaps: keywords with zero published assets
  const { data: allKeywords } = await supabase
    .from("keywords")
    .select("keyword_primary")
    .eq("tenant_id", tenantId);

  const { data: allPublished } = await supabase
    .from("assets")
    .select("keyword_primary")
    .eq("tenant_id", tenantId)
    .eq("status", "published");

  const publishedKeywords = new Set(
    (allPublished ?? [])
      .map((a) => a.keyword_primary?.toLowerCase())
      .filter(Boolean)
  );

  const contentGapCount = (allKeywords ?? []).filter(
    (k) => !publishedKeywords.has(k.keyword_primary.toLowerCase())
  ).length;

  // Generate recommendations
  const nextWeekRecommendations: string[] = [];

  if (publishedThisWeek.length === 0) {
    nextWeekRecommendations.push(
      "No articles were published this week — aim to publish at least 2 articles next week"
    );
  }

  if (contentGapCount > 0) {
    nextWeekRecommendations.push(
      `There are ${contentGapCount} keywords without published content — pick the highest-intent keyword and draft an article`
    );
  }

  if (avgAIDetectionScore > 0.35) {
    nextWeekRecommendations.push(
      "Average AI detection score is above 0.35 — run published articles through the humanizer with a different tone"
    );
  }

  if (avgUniquenessScore > 0 && avgUniquenessScore < 0.8) {
    nextWeekRecommendations.push(
      "Uniqueness scores are trending below 0.8 — add original research, proprietary data, or client quotes to differentiate"
    );
  }

  const lowScoreArticles = publishedThisWeek.filter((a) => a.score < 60);
  if (lowScoreArticles.length > 0) {
    nextWeekRecommendations.push(
      `${lowScoreArticles.length} article(s) scored below 60 — revisit keyword placement and readability before promoting`
    );
  }

  // Generate plain English summary via Claude
  const summary = await generateSummary({
    period,
    publishedCount: publishedThisWeek.length,
    avgAIDetectionScore,
    avgUniquenessScore,
    topKeyword,
    contentGapCount,
    topArticle: publishedThisWeek[0] ?? null,
  });

  return {
    period,
    summary,
    publishedThisWeek,
    avgAIDetectionScore,
    avgUniquenessScore,
    topKeyword,
    contentGapCount,
    nextWeekRecommendations,
  };
}

async function generateSummary(data: {
  period: { start: string; end: string };
  publishedCount: number;
  avgAIDetectionScore: number;
  avgUniquenessScore: number;
  topKeyword: string;
  contentGapCount: number;
  topArticle: DigestArticle | null;
}): Promise<string> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: `You write brief weekly content performance summaries for an internal team. 2-3 sentences max. Use specific numbers from the data provided. No fluff, no greetings, no sign-offs. Plain English.`,
    messages: [
      {
        role: "user",
        content: `Write a weekly digest summary for ${data.period.start} to ${data.period.end}:
- Articles published: ${data.publishedCount}
- Average AI detection score: ${data.avgAIDetectionScore} (lower is better, under 0.35 is target)
- Average uniqueness score: ${data.avgUniquenessScore} (higher is better, above 0.75 is target)
- Top keyword: ${data.topKeyword || "none"}
- Content gaps remaining: ${data.contentGapCount}
- Top article: ${data.topArticle ? `"${data.topArticle.title}" (score: ${data.topArticle.score})` : "none published"}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return block.text;
}
