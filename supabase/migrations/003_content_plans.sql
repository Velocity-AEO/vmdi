-- ============================================================
-- VMDI Migration 003: Content Plans & Briefs
-- ============================================================

-- 1. CONTENT PLANS
CREATE TABLE content_plans (
  plan_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  month        TEXT NOT NULL,
  plan_data    JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plans_tenant ON content_plans(tenant_id);
CREATE INDEX idx_plans_month  ON content_plans(tenant_id, month);

ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_tenant_isolation" ON content_plans
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- 2. CONTENT BRIEFS
CREATE TABLE content_briefs (
  brief_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  plan_id           UUID REFERENCES content_plans(plan_id) ON DELETE SET NULL,
  asset_id          UUID REFERENCES assets(asset_id) ON DELETE SET NULL,
  keyword           TEXT NOT NULL,
  title             TEXT,
  angle             TEXT,
  target_audience   TEXT,
  word_count_target INTEGER,
  tone              TEXT,
  suggested_h2s     TEXT[] DEFAULT '{}',
  must_include      TEXT[] DEFAULT '{}',
  must_avoid        TEXT[] DEFAULT '{}',
  estimated_impact  TEXT,
  reasoning         TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_briefs_tenant  ON content_briefs(tenant_id);
CREATE INDEX idx_briefs_plan    ON content_briefs(plan_id);
CREATE INDEX idx_briefs_status  ON content_briefs(status);

ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefs_tenant_isolation" ON content_briefs
  FOR ALL
  USING (tenant_id::text = current_setting('app.tenant_id', true));
