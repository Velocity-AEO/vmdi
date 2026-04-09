import { supabase } from "./supabase";
import type { EventAction } from "@/types/vmdi";

export async function logEvent(params: {
  tenant_id: string;
  action: EventAction;
  asset_id?: string | null;
  campaign_id?: string | null;
  actor_id?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("events").insert({
    tenant_id: params.tenant_id,
    action: params.action,
    asset_id: params.asset_id ?? null,
    campaign_id: params.campaign_id ?? null,
    actor_id: params.actor_id ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("Failed to log event:", error);
  }
}
