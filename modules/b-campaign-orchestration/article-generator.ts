import Anthropic from "@anthropic-ai/sdk";
import type { ArticleGenInput, ArticleGenResult } from "./types.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function buildGenerationPrompt(input: ArticleGenInput): string {
  const sourceContext = input.ingestedDoc
    ? `SOURCE DOCUMENT:
Title: ${input.ingestedDoc.title}
Summary: ${input.ingestedDoc.summary}
Key Facts:
${input.ingestedDoc.keyFacts.map((f) => `- ${f}`).join("\n")}
Content Type: ${input.ingestedDoc.contentType}
Suggested Keywords: ${input.ingestedDoc.suggestedKeywords.join(", ")}

Use ONLY the facts from this source document. Do not invent additional claims or statistics.`
    : `TOPIC: ${input.topic}

Write based on this topic. Use real, verifiable examples where possible. If you reference a specific statistic or tool, it must be something that actually exists.`;

  const duplicateWarning =
    input.existingAssetTitles.length > 0
      ? `\nEXISTING TITLES (do NOT duplicate or closely rewrite these):
${input.existingAssetTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  return `You are writing an article for VAEO's publishing platform. The author byline is ${input.authorName}.

${sourceContext}
${duplicateWarning}

PRIMARY KEYWORD: ${input.primaryKeyword}
SECONDARY KEYWORDS: ${input.secondaryKeywords.join(", ")}
TARGET WORD COUNT: ${input.targetWordCount}
TONE: ${input.tone}

STRUCTURAL RULES — follow every one:
1. Open with a specific anecdote, statistic, or concrete scenario. NEVER open with a definition or "In today's world" style intro.
2. Use short paragraphs: 2-4 sentences maximum per paragraph.
3. Exactly one H1 (the title). Multiple H2 section headers throughout.
4. Place the primary keyword in: the title, the first paragraph, at least one H2, and the conclusion.
5. No bullet lists or numbered lists in the first 20% or last 20% of the article.
6. Vary sentence length aggressively. Mix 5-word sentences with 25-word sentences. Never stack three sentences of similar length.
7. Include at least 2 specific examples — real company names, real tools, concrete numbers, or named frameworks.
8. Write in first person plural ("we") as if the author is a VAEO expert sharing professional insight.
9. End with a clear takeaway or call to action, not a vague summary.

OUTPUT FORMAT — respond with valid JSON only, no markdown fences:
{
  "title": "string (the H1)",
  "excerpt": "string (1-2 sentence teaser for previews/cards)",
  "body": "string (full article in Markdown, starting with the H1 as # Title)",
  "suggestedH2s": ["string (list of H2 headings used in the article)"]
}`;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function countWords(text: string): number {
  return text
    .replace(/[#*_`>\-|]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export async function generateArticle(
  input: ArticleGenInput
): Promise<ArticleGenResult> {
  const effectiveInput: ArticleGenInput = {
    ...input,
    targetWordCount: input.targetWordCount || 1200,
  };

  const prompt = buildGenerationPrompt(effectiveInput);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude.");
  }

  const parsed = JSON.parse(textBlock.text) as {
    title: string;
    excerpt: string;
    body: string;
    suggestedH2s: string[];
  };

  const wordCount = countWords(parsed.body);
  const estimatedReadTime = Math.max(1, Math.round(wordCount / 238));

  return {
    title: parsed.title,
    slug: slugify(parsed.title),
    excerpt: parsed.excerpt,
    body: parsed.body,
    suggestedH2s: parsed.suggestedH2s,
    wordCount,
    estimatedReadTime,
  };
}
