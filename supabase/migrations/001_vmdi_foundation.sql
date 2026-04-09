-- ============================================================
-- VMDI Foundation Schema
-- Velocity Media Distribution Infrastructure
-- ============================================================

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type asset_type as enum (
  'article',
  'case_study',
  'blog_post',
  'landing_page'
);

create type asset_status as enum (
  'draft',
  'awaiting_approval',
  'approved',
  'published',
  'rejected'
);

create type channel_type as enum (
  'vmdi_blog',
  'vaeo_blog',
  'wordpress'
);

-- ============================================================
-- 1. TENANTS
-- ============================================================

create table tenants (
  tenant_id      uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  primary_domain text,
  time_zone      text not null default 'America/New_York',
  created_at     timestamptz not null default now()
);

alter table tenants enable row level security;

create policy "tenant_isolation" on tenants
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 2. AUTHORS
-- ============================================================

create table authors (
  author_id      uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(tenant_id) on delete cascade,
  name           text not null,
  bio            text,
  headshot_url   text,
  expertise_tags text[] default '{}',
  social_links   jsonb default '{}',
  created_at     timestamptz not null default now()
);

create index idx_authors_tenant on authors(tenant_id);

alter table authors enable row level security;

create policy "authors_tenant_isolation" on authors
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 3. KEYWORDS
-- ============================================================

create table keywords (
  keyword_id         uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(tenant_id) on delete cascade,
  keyword_primary    text not null,
  keywords_secondary text[] default '{}',
  intent             text,
  cluster            text,
  created_at         timestamptz not null default now()
);

create index idx_keywords_tenant on keywords(tenant_id);

alter table keywords enable row level security;

create policy "keywords_tenant_isolation" on keywords
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 4. ASSETS
-- ============================================================

create table assets (
  asset_id           uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(tenant_id) on delete cascade,
  author_id          uuid references authors(author_id) on delete set null,
  keyword_id         uuid references keywords(keyword_id) on delete set null,
  type               asset_type not null,
  status             asset_status not null default 'draft',
  version            integer not null default 1,
  title              text not null,
  body               text,
  excerpt            text,
  keyword_primary    text,
  keywords_secondary text[] default '{}',
  canonical_url      text,
  slug               text,
  legal_owner        text,
  license_type       text,
  uniqueness_score   float check (uniqueness_score >= 0 and uniqueness_score <= 1),
  duplicate_flag     boolean not null default false,
  schema_json        jsonb default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz
);

create index idx_assets_tenant on assets(tenant_id);
create index idx_assets_status on assets(status);
create index idx_assets_created on assets(created_at);
create index idx_assets_tenant_status on assets(tenant_id, status);
create index idx_assets_slug on assets(tenant_id, slug);

alter table assets enable row level security;

create policy "assets_tenant_isolation" on assets
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_assets_updated_at
  before update on assets
  for each row
  execute function update_updated_at();

-- ============================================================
-- 5. CAMPAIGNS
-- ============================================================

create table campaigns (
  campaign_id    uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(tenant_id) on delete cascade,
  name           text not null,
  status         text not null default 'draft',
  scheduled_time timestamptz,
  created_at     timestamptz not null default now()
);

create index idx_campaigns_tenant on campaigns(tenant_id);
create index idx_campaigns_status on campaigns(status);
create index idx_campaigns_created on campaigns(created_at);

alter table campaigns enable row level security;

create policy "campaigns_tenant_isolation" on campaigns
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 6. CAMPAIGN_ASSETS (join table)
-- ============================================================

create table campaign_assets (
  campaign_id uuid not null references campaigns(campaign_id) on delete cascade,
  asset_id    uuid not null references assets(asset_id) on delete cascade,
  primary key (campaign_id, asset_id)
);

alter table campaign_assets enable row level security;

create policy "campaign_assets_tenant_isolation" on campaign_assets
  using (
    exists (
      select 1 from campaigns c
      where c.campaign_id = campaign_assets.campaign_id
        and c.tenant_id = current_setting('app.tenant_id', true)::uuid
    )
  );

-- ============================================================
-- 7. EVENTS (audit log)
-- ============================================================

create table events (
  event_id    uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(tenant_id) on delete cascade,
  asset_id    uuid references assets(asset_id) on delete set null,
  campaign_id uuid references campaigns(campaign_id) on delete set null,
  event_type  text not null,
  actor       text not null,
  result      text,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

create index idx_events_tenant on events(tenant_id);
create index idx_events_created on events(created_at);
create index idx_events_type on events(event_type);
create index idx_events_asset on events(asset_id);

alter table events enable row level security;

create policy "events_tenant_isolation" on events
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ============================================================
-- 8. CHANNELS
-- ============================================================

create table channels (
  channel_id uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(tenant_id) on delete cascade,
  name       text not null,
  type       channel_type not null,
  api_config jsonb default '{}',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_channels_tenant on channels(tenant_id);

alter table channels enable row level security;

create policy "channels_tenant_isolation" on channels
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);
