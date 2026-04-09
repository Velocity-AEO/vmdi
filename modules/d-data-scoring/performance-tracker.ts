import { getSupabase } from "./supabase.js";

export interface PerformanceEventMetadata {
  keyword?: string;
  url?: string;
  source?: string;
  previousValue?: number;
  delta?: number;
}

export type PerformanceEventType =
  | "pageview"
  | "ranking_change"
  | "ai_citation"
  | "backlink"
  | "engagement";

export interface PerformanceEvent {
  assetId: string;
  tenantId: string;
  eventType: PerformanceEventType;
  value: number;
  metadata: PerformanceEventMetadata;
  recordedAt: string;
}

export async function recordPerformanceEvent(
  event: PerformanceEvent
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase.from("asset_performance").insert({
    asset_id: event.assetId,
    tenant_id: event.tenantId,
    event_type: event.eventType,
    value: event.value,
    metadata: event.metadata,
    recorded_at: event.recordedAt,
  });

  if (error) {
    throw new Error(`Failed to record performance event: ${error.message}`);
  }
}

// ------------------------------------------------------------------
// SQL for asset_performance table:
// ------------------------------------------------------------------
//
// CREATE TABLE asset_performance (
//   perf_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   asset_id    UUID REFERENCES assets(asset_id) ON DELETE SET NULL,
//   tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
//   event_type  TEXT NOT NULL,
//   value       NUMERIC,
//   metadata    JSONB DEFAULT '{}',
//   recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// CREATE INDEX idx_perf_asset     ON asset_performance(asset_id);
// CREATE INDEX idx_perf_tenant    ON asset_performance(tenant_id);
// CREATE INDEX idx_perf_type      ON asset_performance(event_type);
// CREATE INDEX idx_perf_recorded  ON asset_performance(recorded_at);
// CREATE INDEX idx_perf_tenant_asset ON asset_performance(tenant_id, asset_id);
//
// ALTER TABLE asset_performance ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "perf_tenant_isolation" ON asset_performance
//   USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
