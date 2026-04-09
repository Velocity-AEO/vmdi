export type AssetStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "rejected";

export type AssetType = "blog_post" | "landing_page" | "learning_center";

export type Tone = "professional" | "conversational" | "educational";

export interface Asset {
  id: string;
  title: string;
  body: string;
  status: AssetStatus;
  type: AssetType;
  keyword: string;
  secondary_keywords: string[];
  tone: Tone;
  author_id: string;
  author_name: string;
  word_count: number;
  ai_detection_score: number | null;
  uniqueness_score: number | null;
  schema_json: object | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Keyword {
  id: string;
  keyword: string;
  intent: string;
  cluster: string;
  created_at: string;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  url?: string;
  created_at: string;
}

export interface AssetEvent {
  id: string;
  asset_id: string;
  event_type: string;
  description: string;
  actor: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}
