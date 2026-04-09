export interface ContentGap {
  keyword: string;
  keywordId: string;
  intent: string;
  cluster: string;
  gapType: "missing" | "thin" | "outdated" | "cannibalizing";
  priority: "high" | "medium" | "low";
  reason: string;
  existingAssetIds: string[];
}

export interface ContentBrief {
  briefId: string;
  keyword: string;
  title: string;
  angle: string;
  targetAudience: string;
  recommendedWordCount: number;
  tone: "professional" | "conversational" | "educational";
  suggestedH2s: string[];
  mustInclude: string[];
  mustAvoid: string[];
  competingAssets: { title: string; assetId: string }[];
  estimatedImpact: "high" | "medium" | "low";
  reasoning: string;
}

export interface PlanItem {
  week: 1 | 2 | 3 | 4;
  priority: number;
  brief: ContentBrief;
  gap: ContentGap;
  estimatedPublishDate: string;
}

export interface MonthlyPlan {
  month: string;
  tenantId: string;
  generatedAt: string;
  totalArticles: number;
  plan: PlanItem[];
  summary: string;
}

export interface ExecutePlanItemResult {
  assetId: string;
}
