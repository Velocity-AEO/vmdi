import { humanizeContent, type Tone } from "./humanizer.js";
import { detectAI, type AISignal } from "./ai-detector.js";
import { rewriteUntilHuman } from "./ai-rewriter.js";
import { enforceKeywords } from "./keyword-enforcer.js";
import { checkUniqueness } from "./uniqueness-checker.js";
import { generateArticleSchema, type ArticleSchemaJsonLd } from "./schema-generator.js";

export interface PipelineInput {
  rawContent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  tone: Tone;
  author: {
    name: string;
    url?: string;
  };
  url?: string;
  existingAssets: string[];
}

export interface PipelineResult {
  success: boolean;
  content: string;
  schema: ArticleSchemaJsonLd | null;
  uniquenessScore: number;
  aiDetectionScore: number;
  aiDetectionSignals: AISignal[];
  issues: string[];
}

const MAX_KEYWORD_ATTEMPTS = 2;
const MAX_AI_REWRITE_ATTEMPTS = 3;

export async function runContentPipeline(
  input: PipelineInput
): Promise<PipelineResult> {
  const issues: string[] = [];
  let aiDetectionScore = 0;
  let aiDetectionSignals: AISignal[] = [];

  // Step 1: Humanize
  let content: string;
  try {
    content = await humanizeContent(input.rawContent, input.tone);
  } catch (err) {
    return {
      success: false,
      content: input.rawContent,
      schema: null,
      uniquenessScore: 0,
      aiDetectionScore: 0,
      aiDetectionSignals: [],
      issues: [`Humanization failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  // Step 2: AI Detection — run after humanize, before keyword enforcement
  const detection = await detectAI(content);
  aiDetectionScore = detection.score;
  aiDetectionSignals = detection.signals;

  if (!detection.passesThreshold) {
    // Attempt to rewrite until it passes
    const rewrite = await rewriteUntilHuman(content, MAX_AI_REWRITE_ATTEMPTS);
    aiDetectionScore = rewrite.finalScore;

    if (!rewrite.success) {
      return {
        success: false,
        content: rewrite.content,
        schema: null,
        uniquenessScore: 0,
        aiDetectionScore: rewrite.finalScore,
        aiDetectionSignals,
        issues: [
          `failed_ai_detection: Content scored ${rewrite.finalScore} after ${rewrite.attempts} rewrite attempts (threshold: 0.35)`,
          ...rewrite.history.map(
            (h) => `Attempt ${h.attempt}: score ${h.score}, signals: ${h.signals.join(", ")}`
          ),
        ],
      };
    }

    content = rewrite.content;
    // Re-run detection to get updated signals
    const postRewrite = await detectAI(content);
    aiDetectionScore = postRewrite.score;
    aiDetectionSignals = postRewrite.signals;
    issues.push(`AI detection: passed after ${rewrite.attempts} rewrite attempt(s) (score: ${rewrite.finalScore})`);
  }

  // Step 3: Enforce keywords (up to MAX_KEYWORD_ATTEMPTS)
  let keywordsPassed = false;
  for (let attempt = 1; attempt <= MAX_KEYWORD_ATTEMPTS; attempt++) {
    const result = await enforceKeywords(
      content,
      input.primaryKeyword,
      input.secondaryKeywords
    );

    content = result.fixedContent;

    if (result.passed) {
      keywordsPassed = true;
      issues.push(...result.issues);
      break;
    }

    if (attempt === MAX_KEYWORD_ATTEMPTS) {
      return {
        success: false,
        content,
        schema: null,
        uniquenessScore: 0,
        aiDetectionScore,
        aiDetectionSignals,
        issues: [
          `Keyword enforcement failed after ${MAX_KEYWORD_ATTEMPTS} attempts`,
          ...result.issues,
        ],
      };
    }
  }

  // Step 4: Check uniqueness
  const uniqueness = await checkUniqueness(content, input.existingAssets);

  if (uniqueness.isDuplicate) {
    return {
      success: false,
      content,
      schema: null,
      uniquenessScore: uniqueness.score,
      aiDetectionScore,
      aiDetectionSignals,
      issues: [
        `Content too similar to existing assets (score: ${uniqueness.score}). Similar: ${uniqueness.similarAssets.join(", ")}`,
      ],
    };
  }

  // Step 5: Generate schema
  const title =
    content.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? input.primaryKeyword;

  const schema = generateArticleSchema({
    title,
    body: content,
    author: input.author,
    url: input.url ?? "",
    publishedAt: new Date().toISOString(),
    keywords: [input.primaryKeyword, ...input.secondaryKeywords],
  });

  return {
    success: true,
    content,
    schema,
    uniquenessScore: uniqueness.score,
    aiDetectionScore,
    aiDetectionSignals,
    issues,
  };
}
