import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatMessage,
  ChatContext,
  ChatResponse,
  ChatAction,
} from "./types.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function buildSystemPrompt(context: ChatContext): string {
  return `You are VAEO's content strategist. You help create SEO articles for VAEO's blog and publishing platform. You always map content to keywords. You never invent facts. You ask one question at a time.

Your job is to guide the user through creating a new article. Follow this flow:

STEP 1: Ask what they want to write about. They can describe a topic, paste a win/result, or upload a document.
STEP 2: Help them select a target keyword from the available list. If their topic doesn't match any keyword, suggest the closest matches.
STEP 3: Ask what tone they want: professional, conversational, or educational.
STEP 4: Confirm the details, then generate the article.
STEP 5: After generation, ask if they want to approve the draft, or regenerate with changes.

AVAILABLE KEYWORDS FOR THIS TENANT:
${context.availableKeywords.length > 0 ? context.availableKeywords.map((k) => `- ${k}`).join("\n") : "(none configured yet)"}

EXISTING ARTICLE TITLES (avoid duplicates):
${context.existingAssetTitles.length > 0 ? context.existingAssetTitles.map((t) => `- ${t}`).join("\n") : "(none yet)"}

RESPONSE FORMAT:
Always respond with valid JSON, no markdown fences:
{
  "message": "your conversational reply to the user",
  "action": null or one of the action objects below
}

ACTION TYPES you can emit:
- When the user wants to upload a document: { "type": "request_document_upload" }
- When you need them to pick a keyword: { "type": "request_keyword_selection", "keywords": ["keyword1", "keyword2", ...] }
- When you have enough info to generate: { "type": "generate_article", "params": { "topic": "...", "primaryKeyword": "...", "secondaryKeywords": [...], "targetWordCount": 1200, "tone": "professional|conversational|educational", "authorName": "Vincent Goodrich", "existingAssetTitles": [...] } }
- When confirming a saved draft: { "type": "confirm_draft", "assetId": "..." }

If no action is needed yet, set "action" to null. Only emit one action per response. Always include a conversational message alongside any action.`;
}

export async function runChatbot(
  messages: ChatMessage[],
  context: ChatContext
): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(context);

  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude.");
  }

  let parsed: { message: string; action?: ChatAction | null };

  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    return {
      message: textBlock.text,
      action: undefined,
    };
  }

  return {
    message: parsed.message,
    action: parsed.action ?? undefined,
  };
}
