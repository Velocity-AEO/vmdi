export interface IngestedDocument {
  rawText: string;
  title: string;
  summary: string;
  keyFacts: string[];
  suggestedKeywords: string[];
  contentType: "case_study" | "win" | "explanation" | "guide" | "unknown";
}

export interface ArticleGenInput {
  topic?: string;
  ingestedDoc?: IngestedDocument;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetWordCount: number;
  tone: "professional" | "conversational" | "educational";
  authorName: string;
  existingAssetTitles: string[];
}

export interface ArticleGenResult {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  suggestedH2s: string[];
  wordCount: number;
  estimatedReadTime: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  tenantId: string;
  availableKeywords: string[];
  existingAssetTitles: string[];
}

export type ChatAction =
  | { type: "generate_article"; params: ArticleGenInput }
  | { type: "request_keyword_selection"; keywords: string[] }
  | { type: "request_document_upload" }
  | { type: "confirm_draft"; assetId: string };

export interface ChatResponse {
  message: string;
  action?: ChatAction;
}

export interface AssetMeta {
  tenantId: string;
  authorId: string;
  keywordId: string;
  channelIds: string[];
}
