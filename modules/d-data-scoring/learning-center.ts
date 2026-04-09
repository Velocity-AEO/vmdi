import { getSupabase } from "./supabase.js";

export interface KeywordPerformance {
  keyword: string;
  avgScore: number;
  articleCount: number;
}

export interface ArticlePerformance {
  assetId: string;
  title: string;
  score: number;
  views: number;
}

export interface ContentGap {
  keyword: string;
  reason: string;
}

export interface TrendPoint {
  date: string;
  avgScore: number;
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  type: "keyword" | "content_quality" | "volume" | "topic_gap";
  message: string;
}

export interface LearningInsights {
  topPerformingKeywords: KeywordPerformance[];
  topPerformingArticles: ArticlePerformance[];
  contentGaps: ContentGap[];
  aiDetectionTrend: TrendPoint[];
  uniquenessTrend: TrendPoint[];
  recommendations: Recommendation[];
}

function weekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export async function getLearningInsights(
  tenantId: string
): Promise<LearningInsights> {
  const supabase = getSupabase();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  // Fetch published assets with scores
  const { data: assets } = await supabase
    .from("assets")
    .select(
      "asset_id, title, keyword_primary, uniqueness_score, overall_score, status, created_at"
    )
    .eq("tenant_id", tenantId)
    .order("overall_score", { ascending: false });

  const allAssets = assets ?? [];
  const publishedAssets = allAssets.filter((a) => a.status === "published");

  // Fetch all keywords for this tenant
  const { data: keywords } = await supabase
    .from("keywords")
    .select("keyword_id, keyword_primary")
    .eq("tenant_id", tenantId);

  const allKeywords = keywords ?? [];

  // Fetch performance events for the last 30 days
  const { data: perfEvents } = await supabase
    .from("asset_performance")
    .select("asset_id, event_type, value, recorded_at")
    .eq("tenant_id", tenantId)
    .gte("recorded_at", thirtyDaysAgoISO);

  const events = perfEvents ?? [];

  // ---------- Top Performing Keywords ----------
  const keywordMap = new Map<
    string,
    { totalScore: number; count: number }
  >();

  for (const asset of publishedAssets) {
    const kw = asset.keyword_primary;
    if (!kw) continue;
    const entry = keywordMap.get(kw) ?? { totalScore: 0, count: 0 };
    entry.totalScore += asset.overall_score ?? 0;
    entry.count += 1;
    keywordMap.set(kw, entry);
  }

  const topPerformingKeywords: KeywordPerformance[] = Array.from(
    keywordMap.entries()
  )
    .map(([keyword, { totalScore, count }]) => ({
      keyword,
      avgScore: Math.round(totalScore / count),
      articleCount: count,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5);

  // ---------- Top Performing Articles ----------
  const viewsByAsset = new Map<string, number>();
  for (const e of events) {
    if (e.event_type === "pageview") {
      viewsByAsset.set(
        e.asset_id,
        (viewsByAsset.get(e.asset_id) ?? 0) + (e.value ?? 0)
      );
    }
  }

  const topPerformingArticles: ArticlePerformance[] = publishedAssets
    .map((a) => ({
      assetId: a.asset_id,
      title: a.title,
      score: a.overall_score ?? 0,
      views: viewsByAsset.get(a.asset_id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || b.views - a.views)
    .slice(0, 5);

  // ---------- Content Gaps ----------
  const publishedKeywords = new Set(
    publishedAssets
      .map((a) => a.keyword_primary?.toLowerCase())
      .filter(Boolean)
  );

  const contentGaps: ContentGap[] = allKeywords
    .filter(
      (k) => !publishedKeywords.has(k.keyword_primary.toLowerCase())
    )
    .map((k) => ({
      keyword: k.keyword_primary,
      reason: "No published article targets this keyword",
    }))
    .slice(0, 5);

  // ---------- AI Detection Trend (last 30 days, grouped by week) ----------
  const aiDetectionEvents = events.filter(
    (e) => e.event_type === "ai_detection"
  );
  const aiWeekly = new Map<string, { total: number; count: number }>();
  for (const e of aiDetectionEvents) {
    const week = weekStart(new Date(e.recorded_at));
    const entry = aiWeekly.get(week) ?? { total: 0, count: 0 };
    entry.total += e.value ?? 0;
    entry.count += 1;
    aiWeekly.set(week, entry);
  }
  const aiDetectionTrend: TrendPoint[] = Array.from(aiWeekly.entries())
    .map(([date, { total, count }]) => ({
      date,
      avgScore: parseFloat((total / count).toFixed(3)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---------- Uniqueness Trend ----------
  // Derive from assets created in the last 30 days
  const recentAssets = allAssets.filter(
    (a) => new Date(a.created_at) >= thirtyDaysAgo && a.uniqueness_score !== null
  );
  const uWeekly = new Map<string, { total: number; count: number }>();
  for (const a of recentAssets) {
    const week = weekStart(new Date(a.created_at));
    const entry = uWeekly.get(week) ?? { total: 0, count: 0 };
    entry.total += a.uniqueness_score ?? 0;
    entry.count += 1;
    uWeekly.set(week, entry);
  }
  const uniquenessTrend: TrendPoint[] = Array.from(uWeekly.entries())
    .map(([date, { total, count }]) => ({
      date,
      avgScore: parseFloat((total / count).toFixed(3)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ---------- Recommendations ----------
  const recommendations: Recommendation[] = [];

  if (contentGaps.length >= 3) {
    recommendations.push({
      priority: "high",
      type: "topic_gap",
      message: `${contentGaps.length} target keywords have no published content — prioritize writing articles for your highest-intent gaps`,
    });
  }

  const lowScoreArticles = publishedAssets.filter(
    (a) => (a.overall_score ?? 0) < 60
  );
  if (lowScoreArticles.length > 0) {
    recommendations.push({
      priority: "high",
      type: "content_quality",
      message: `${lowScoreArticles.length} published article(s) score below 60 — rewrite or update them to improve keyword placement and readability`,
    });
  }

  if (publishedAssets.length < 5) {
    recommendations.push({
      priority: "medium",
      type: "volume",
      message:
        "Publishing volume is low — aim for at least 4-5 articles per month to build topical authority",
    });
  }

  const recentAiScores = aiDetectionTrend.slice(-2);
  if (
    recentAiScores.length === 2 &&
    recentAiScores[1].avgScore > recentAiScores[0].avgScore + 0.05
  ) {
    recommendations.push({
      priority: "medium",
      type: "content_quality",
      message:
        "AI detection scores are trending upward — review the humanization step and consider adding more original data and quotes",
    });
  }

  const topKeyword = topPerformingKeywords[0];
  if (topKeyword && topKeyword.articleCount < 3) {
    recommendations.push({
      priority: "low",
      type: "keyword",
      message: `Your best keyword "${topKeyword.keyword}" only has ${topKeyword.articleCount} article(s) — create supporting content to build a topic cluster`,
    });
  }

  return {
    topPerformingKeywords,
    topPerformingArticles,
    contentGaps,
    aiDetectionTrend,
    uniquenessTrend,
    recommendations,
  };
}
