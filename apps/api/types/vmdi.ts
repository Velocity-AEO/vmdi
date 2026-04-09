export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type AssetStatus =
  | "draft"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "rejected";

export type AssetType =
  | "blog"
  | "article"
  | "case_study"
  | "landing_page"
  | "social_post";

export interface Asset {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  body: string | null;
  summary: string | null;
  type: AssetType;
  status: AssetStatus;
  version: number;
  keyword_primary: string;
  keywords_secondary: string[];
  author_id: string;
  campaign_id: string | null;
  channel_id: string | null;
  published_at: string | null;
  published_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Keyword {
  id: string;
  tenant_id: string;
  term: string;
  volume: number | null;
  difficulty: number | null;
  intent: string | null;
  cluster: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed";
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type EventAction =
  | "asset.created"
  | "asset.updated"
  | "asset.approved"
  | "asset.published"
  | "asset.rejected"
  | "keyword.created"
  | "author.created";

export interface Event {
  id: string;
  tenant_id: string;
  action: EventAction;
  asset_id: string | null;
  campaign_id: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Channel {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta: Record<string, unknown> | null;
}
