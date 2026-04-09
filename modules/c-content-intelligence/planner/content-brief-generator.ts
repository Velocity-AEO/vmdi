import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { ContentGap, ContentBrief } from "./types.js";

export type { ContentBrief } from "./types.js";

interface AssetRow {
  asset_id: string;
  title: string;
  keyword_primary: string | null;
  keywords_secondary: string[];
  body: string | null;
}

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;

function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function buildBriefPrompt(gap: ContentGap, existingTitles: string[]): string {
  const gapContext: Record<ContentGap["gapType"], string> = {
    missing: `There is NO existing content for the keyword "${gap.keyword}". This is a green-field opportunity. The article needs to be comprehensive enough to establish topical authority from scratch.`,
    thin: `Existing content for "${gap.keyword}" is thin (under 800 words). The new article should be a thorough replacement — not a slight expansion. It must go substantially deeper.`,
    outdated: `Existing content for "${gap.keyword}" is outdated (6+ months without updates). The new article should incorporate current data, trends, and examples from 2025-2026.`,
    cannibalizing: `Multiple articles compete for "${gap.keyword}". The new article must take a DISTINCT angle that doesn't overlap with: ${existingTitles.map((t) => `"${t}"`).join(", ")}. Consider consolidating or differentiating.`,
  };

  return `You are a content strategist for VAEO, a technical SEO company. Generate a detailed content brief for an article targeting the keyword "${gap.keyword}".

GAP ANALYSIS:
- Gap type: ${gap.gapType}
- Intent: ${gap.intent}
- Cluster: ${gap.cluster}
- Context: ${gapContext[gap.gapType]}
- Reason: ${gap.reason}

${existingTitles.length > 0 ? `EXISTING CONTENT (do NOT duplicate these angles):\n${existingTitles.map((t) => `- ${t}`).join("\n")}` : "No existing content for this keyword."}

Return a JSON object with exactly these fields:
{
  "title": "A specific, compelling article title (not generic — include a number, year, or unique hook)",
  "angle": "The specific angle or thesis of the article (1-2 sentences)",
  "targetAudience": "Who this article is written for (be specific: role, experience level, situation)",
  "recommendedWordCount": number between 1200-3000 based on intent and depth needed,
  "tone": one of "professional", "conversational", or "educational",
  "suggestedH2s": ["array", "of", "5-8", "specific", "H2", "subheadings"],
  "mustInclude": ["specific facts", "named tools", "real examples", "data points to reference"],
  "mustAvoid": ["topics that would cannibalize existing content", "generic advice", "AI-sounding patterns"],
  "estimatedImpact": "high" or "medium" or "low",
  "reasoning": "2-3 sentences explaining why this article matters for VAEO's content strategy right now"
}

Rules:
- The title must be specific, not generic. "Technical SEO Audit Guide" is bad. "The 23-Point Technical SEO Audit We Run on Every Client Site" is good.
- suggestedH2s must be specific section titles, not vague categories.
- mustInclude should name real tools (Screaming Frog, Ahrefs, Search Console), specific techniques, or data points.
- mustAvoid must include any topics already covered by existing articles.
- Set estimatedImpact to "high" for missing/cannibalizing gaps, "medium" for thin, "low" for outdated.

Return ONLY the JSON object. No markdown fences, no commentary.`;
}

export async function generateContentBrief(
  gap: ContentGap,
  tenantId: string
): Promise<ContentBrief> {
  const supabase = createSupabaseClient();

  // Fetch existing assets in the same cluster/keyword for context
  const { data: existingAssets } = await supabase
    .from("assets")
    .select("asset_id, title, keyword_primary, keywords_secondary, body")
    .eq("tenant_id", tenantId)
    .eq("status", "published")
    .returns<AssetRow[]>();

  const clusterAssets = (existingAssets ?? []).filter(
    (a) =>
      a.keyword_primary?.toLowerCase() === gap.keyword.toLowerCase() ||
      gap.existingAssetIds.includes(a.asset_id)
  );

  const existingTitles = clusterAssets.map((a) => a.title);
  const competingAssets = clusterAssets.map((a) => ({
    title: a.title,
    assetId: a.asset_id,
  }));

  // Generate brief via Claude
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: buildBriefPrompt(gap, existingTitles),
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = JSON.parse(text) as {
    title: string;
    angle: string;
    targetAudience: string;
    recommendedWordCount: number;
    tone: "professional" | "conversational" | "educational";
    suggestedH2s: string[];
    mustInclude: string[];
    mustAvoid: string[];
    estimatedImpact: "high" | "medium" | "low";
    reasoning: string;
  };

  return {
    briefId: randomUUID(),
    keyword: gap.keyword,
    title: parsed.title,
    angle: parsed.angle,
    targetAudience: parsed.targetAudience,
    recommendedWordCount: parsed.recommendedWordCount,
    tone: parsed.tone,
    suggestedH2s: parsed.suggestedH2s,
    mustInclude: parsed.mustInclude,
    mustAvoid: parsed.mustAvoid,
    competingAssets,
    estimatedImpact: parsed.estimatedImpact,
    reasoning: parsed.reasoning,
  };
}
