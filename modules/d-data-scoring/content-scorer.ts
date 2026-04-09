import { getSupabase } from "./supabase.js";

export interface ContentScoreComponents {
  aiDetectionScore: number;
  uniquenessScore: number;
  keywordScore: number;
  readabilityScore: number;
  performanceScore: number;
}

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ContentScore {
  assetId: string;
  overallScore: number;
  components: ContentScoreComponents;
  grade: Grade;
  recommendations: string[];
  lastScored: string;
}

function computeGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

// Lower AI detection = better. 0 = perfectly human, 1 = flagged AI.
function scoreAiDetection(aiDetectionRaw: number | null): number {
  if (aiDetectionRaw === null) return 50; // no data — neutral
  return Math.round((1 - aiDetectionRaw) * 100);
}

function scoreUniqueness(uniquenessRaw: number | null): number {
  if (uniquenessRaw === null) return 50;
  return Math.round(uniquenessRaw * 100);
}

function scoreKeywordPlacement(
  body: string | null,
  title: string | null,
  keywordPrimary: string | null
): number {
  if (!keywordPrimary || !body) return 0;

  let score = 0;
  const kw = keywordPrimary.toLowerCase();

  if (title && title.toLowerCase().includes(kw)) score += 30;

  const firstParagraph = body.split("\n").find((l) => l.trim().length > 0) ?? "";
  if (firstParagraph.toLowerCase().includes(kw)) score += 30;

  const bodyLower = body.toLowerCase();
  const occurrences = bodyLower.split(kw).length - 1;
  if (occurrences >= 2) score += 20;
  else if (occurrences === 1) score += 10;

  // Keyword in any heading
  const headings = body.match(/^#{1,3}\s+.+$/gm) ?? [];
  const kwInHeading = headings.some((h) => h.toLowerCase().includes(kw));
  if (kwInHeading) score += 20;

  return Math.min(score, 100);
}

function scoreReadability(body: string | null): number {
  if (!body) return 0;

  const sentences = body
    .replace(/[.!?]+/g, "|")
    .split("|")
    .filter((s) => s.trim().length > 0);
  const words = body.split(/\s+/).filter((w) => w.length > 0);
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;

  // Flesch-Kincaid Grade Level
  const gradeLevel =
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  // Ideal range: 8-12. Score drops off outside that.
  if (gradeLevel >= 8 && gradeLevel <= 12) return 100;
  if (gradeLevel < 8) return Math.max(0, Math.round(100 - (8 - gradeLevel) * 15));
  return Math.max(0, Math.round(100 - (gradeLevel - 12) * 10));
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;
  if (w.endsWith("e") && count > 1) count--;
  return Math.max(count, 1);
}

async function scorePerformance(
  assetId: string,
  tenantId: string
): Promise<number> {
  const supabase = getSupabase();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: events } = await supabase
    .from("asset_performance")
    .select("event_type, value")
    .eq("asset_id", assetId)
    .eq("tenant_id", tenantId)
    .gte("recorded_at", thirtyDaysAgo.toISOString());

  if (!events || events.length === 0) return 0;

  let score = 0;

  const pageviews = events
    .filter((e) => e.event_type === "pageview")
    .reduce((sum, e) => sum + (e.value ?? 0), 0);
  if (pageviews >= 1000) score += 30;
  else if (pageviews >= 500) score += 25;
  else if (pageviews >= 100) score += 15;
  else if (pageviews > 0) score += 5;

  const rankings = events.filter((e) => e.event_type === "ranking_change");
  const bestRanking = rankings.length > 0
    ? Math.min(...rankings.map((e) => e.value ?? 999))
    : 999;
  if (bestRanking <= 3) score += 30;
  else if (bestRanking <= 10) score += 20;
  else if (bestRanking <= 20) score += 10;

  const aiCitations = events.filter((e) => e.event_type === "ai_citation").length;
  if (aiCitations >= 5) score += 20;
  else if (aiCitations >= 1) score += 10;

  const backlinks = events.filter((e) => e.event_type === "backlink").length;
  if (backlinks >= 5) score += 20;
  else if (backlinks >= 1) score += 10;

  return Math.min(score, 100);
}

function generateRecommendations(
  components: ContentScoreComponents,
  keywordPrimary: string | null
): string[] {
  const recs: string[] = [];

  if (components.aiDetectionScore < 60) {
    recs.push(
      "AI detection score is high — run the content through the humanizer again with a more conversational tone"
    );
  }

  if (components.uniquenessScore < 75) {
    recs.push(
      "Uniqueness score is low — rewrite sections that overlap with existing content to add original examples or data"
    );
  }

  if (components.keywordScore < 50) {
    const kw = keywordPrimary ?? "primary keyword";
    recs.push(
      `Keyword placement needs work — make sure "${kw}" appears in the title, first paragraph, and at least one subheading`
    );
  }

  if (components.readabilityScore < 60) {
    recs.push(
      "Readability is off target — aim for 8th-12th grade level by shortening sentences and simplifying vocabulary"
    );
  }

  if (components.performanceScore < 20) {
    recs.push(
      "No significant traffic or ranking data yet — promote this article through campaigns and internal linking"
    );
  }

  if (components.performanceScore >= 20 && components.performanceScore < 60) {
    recs.push(
      "Article is getting some traction — consider updating with fresh data or expanding sections to capture more long-tail queries"
    );
  }

  if (recs.length === 0) {
    recs.push(
      "Content is performing well across all dimensions — consider using this as a template for future articles"
    );
  }

  return recs;
}

export async function scoreContent(
  assetId: string,
  tenantId: string
): Promise<ContentScore> {
  const supabase = getSupabase();

  const { data: asset, error } = await supabase
    .from("assets")
    .select(
      "asset_id, title, body, keyword_primary, uniqueness_score, status"
    )
    .eq("asset_id", assetId)
    .eq("tenant_id", tenantId)
    .single();

  if (error || !asset) {
    throw new Error(
      `Asset ${assetId} not found: ${error?.message ?? "no data"}`
    );
  }

  // We read ai_detection_score from asset_performance events rather than
  // a column — look for the most recent ai_detection event or fall back to null.
  const { data: aiEvent } = await supabase
    .from("asset_performance")
    .select("value")
    .eq("asset_id", assetId)
    .eq("event_type", "ai_detection")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const aiDetectionRaw: number | null = aiEvent?.value ?? null;

  const performanceScore = await scorePerformance(assetId, tenantId);

  const components: ContentScoreComponents = {
    aiDetectionScore: scoreAiDetection(aiDetectionRaw),
    uniquenessScore: scoreUniqueness(asset.uniqueness_score),
    keywordScore: scoreKeywordPlacement(
      asset.body,
      asset.title,
      asset.keyword_primary
    ),
    readabilityScore: scoreReadability(asset.body),
    performanceScore,
  };

  const weights = {
    aiDetectionScore: 0.2,
    uniquenessScore: 0.2,
    keywordScore: 0.25,
    readabilityScore: 0.15,
    performanceScore: 0.2,
  };

  const overallScore = Math.round(
    components.aiDetectionScore * weights.aiDetectionScore +
      components.uniquenessScore * weights.uniquenessScore +
      components.keywordScore * weights.keywordScore +
      components.readabilityScore * weights.readabilityScore +
      components.performanceScore * weights.performanceScore
  );

  const grade = computeGrade(overallScore);
  const recommendations = generateRecommendations(
    components,
    asset.keyword_primary
  );
  const lastScored = new Date().toISOString();

  // Write overall_score back to asset
  await supabase
    .from("assets")
    .update({ overall_score: overallScore })
    .eq("asset_id", assetId)
    .eq("tenant_id", tenantId);

  return {
    assetId,
    overallScore,
    components,
    grade,
    recommendations,
    lastScored,
  };
}
