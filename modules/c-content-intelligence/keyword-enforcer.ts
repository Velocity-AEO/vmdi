import Anthropic from "@anthropic-ai/sdk";

export interface KeywordEnforcementResult {
  passed: boolean;
  issues: string[];
  fixedContent: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractH1(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function extractFirstParagraph(content: string): string {
  const lines = content.split("\n");
  const paragraphLines: string[] = [];
  let foundContent = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!foundContent) {
      if (trimmed && !trimmed.startsWith("#")) {
        foundContent = true;
        paragraphLines.push(trimmed);
      }
      continue;
    }
    if (trimmed === "") break;
    paragraphLines.push(trimmed);
  }

  return paragraphLines.join(" ");
}

function checkKeywordPresence(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): string[] {
  const issues: string[] = [];
  const lowerPrimary = primaryKeyword.toLowerCase();

  const title = extractTitle(content);
  if (!title || !title.toLowerCase().includes(lowerPrimary)) {
    issues.push(
      `Primary keyword "${primaryKeyword}" not found in title/H1`
    );
  }

  const firstParagraph = extractFirstParagraph(content);
  if (!firstParagraph.toLowerCase().includes(lowerPrimary)) {
    issues.push(
      `Primary keyword "${primaryKeyword}" not found in first paragraph`
    );
  }

  const slug = title ? slugify(title) : "";
  if (!slug.includes(slugify(primaryKeyword))) {
    issues.push(
      `Primary keyword "${primaryKeyword}" would not appear in URL slug (suggested slug: ${slug || "none"})`
    );
  }

  for (const kw of secondaryKeywords) {
    if (!content.toLowerCase().includes(kw.toLowerCase())) {
      issues.push(`Secondary keyword "${kw}" not found in content`);
    }
  }

  return issues;
}

async function fixKeywordsWithClaude(
  content: string,
  issues: string[],
  primaryKeyword: string,
  secondaryKeywords: string[]
): Promise<string> {
  const client = new Anthropic();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: `You are a precise SEO content editor. You will be given content and a list of keyword issues to fix. Make the minimum changes necessary to resolve each issue while keeping the content natural and readable.

Rules:
- If the primary keyword is missing from the title/H1, weave it in naturally
- If the primary keyword is missing from the first paragraph, add or rephrase a sentence to include it
- If secondary keywords are missing, insert them where they fit contextually
- Do not change the overall structure or meaning of the content
- Do not add meta-commentary about your changes
- Return ONLY the fixed content`,
    messages: [
      {
        role: "user",
        content: `Primary keyword: "${primaryKeyword}"
Secondary keywords: ${secondaryKeywords.map((k) => `"${k}"`).join(", ")}

Issues to fix:
${issues.map((i) => `- ${i}`).join("\n")}

Content:
---
${content}
---`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  return block.text;
}

export async function enforceKeywords(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[]
): Promise<KeywordEnforcementResult> {
  const issues = checkKeywordPresence(content, primaryKeyword, secondaryKeywords);

  if (issues.length === 0) {
    return { passed: true, issues: [], fixedContent: content };
  }

  const fixedContent = await fixKeywordsWithClaude(
    content,
    issues,
    primaryKeyword,
    secondaryKeywords
  );

  const remainingIssues = checkKeywordPresence(
    fixedContent,
    primaryKeyword,
    secondaryKeywords
  );

  return {
    passed: remainingIssues.length === 0,
    issues: remainingIssues.length > 0 ? remainingIssues : issues.map((i) => `Fixed: ${i}`),
    fixedContent,
  };
}
