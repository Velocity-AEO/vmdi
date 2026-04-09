import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { analyzeContentGaps } from "./gap-analyzer.js";
import { generateContentBrief } from "./content-brief-generator.js";
import type { ContentBrief, PlanItem, MonthlyPlan } from "./types.js";

export type { PlanItem, MonthlyPlan } from "./types.js";

const MODEL = "claude-sonnet-4-20250514";
const MAX_PLAN_ITEMS = 8;
const ITEMS_PER_WEEK = 2;

function createSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Compute estimated publish dates for each week of the given month. */
function getWeekDates(month: string): Record<1 | 2 | 3 | 4, string> {
  // month format: "2026-04"
  const [year, mon] = month.split("-").map(Number);
  return {
    1: new Date(year, mon - 1, 7).toISOString().split("T")[0],
    2: new Date(year, mon - 1, 14).toISOString().split("T")[0],
    3: new Date(year, mon - 1, 21).toISOString().split("T")[0],
    4: new Date(year, mon - 1, 28).toISOString().split("T")[0],
  };
}

async function generatePlanSummary(plan: PlanItem[]): Promise<string> {
  const client = new Anthropic();

  const briefList = plan
    .map(
      (item) =>
        `Week ${item.week}: "${item.brief.title}" (${item.gap.gapType} gap, ${item.gap.intent} intent, keyword: "${item.gap.keyword}")`
    )
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a content strategist summarizing a monthly content plan for VAEO's internal team. Write a 2-3 sentence plain English overview of this month's content strategy. Be specific about the themes and goals — not generic.

THE PLAN:
${briefList}

Return ONLY the summary text. No bullet points, no headers.`,
      },
    ],
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
}

export async function generateMonthlyPlan(
  tenantId: string,
  month: string
): Promise<MonthlyPlan> {
  // Step 1: Analyze gaps
  const gaps = await analyzeContentGaps(tenantId);

  // Step 2: Take top 8 gaps
  const topGaps = gaps.slice(0, MAX_PLAN_ITEMS);

  // Step 3: Generate briefs for each gap
  const briefs: ContentBrief[] = [];
  for (const gap of topGaps) {
    const brief = await generateContentBrief(gap, tenantId);
    briefs.push(brief);
  }

  // Step 4: Assign to weeks based on priority
  // High priority gaps → week 1, then fill in order
  const weekDates = getWeekDates(month);
  const plan: PlanItem[] = [];

  for (let i = 0; i < briefs.length; i++) {
    const week = (Math.floor(i / ITEMS_PER_WEEK) + 1) as 1 | 2 | 3 | 4;
    plan.push({
      week,
      priority: i + 1,
      brief: briefs[i],
      gap: topGaps[i],
      estimatedPublishDate: weekDates[week],
    });
  }

  // Step 5: Generate summary
  const summary = plan.length > 0
    ? await generatePlanSummary(plan)
    : "No content gaps identified. The keyword bank is fully covered by existing published assets.";

  const generatedAt = new Date().toISOString();

  const monthlyPlan: MonthlyPlan = {
    month,
    tenantId,
    generatedAt,
    totalArticles: plan.length,
    plan,
    summary,
  };

  // Step 6: Persist to Supabase
  const supabase = createSupabaseClient();
  const { error } = await supabase.from("content_plans").insert({
    tenant_id: tenantId,
    month,
    plan_data: monthlyPlan,
    generated_at: generatedAt,
  });

  if (error) {
    throw new Error(`Failed to save content plan: ${error.message}`);
  }

  return monthlyPlan;
}

// ──────────────────────────────────────────────────────────────
// SQL for content_plans table (add to Supabase migrations):
//
// create table content_plans (
//   plan_id      uuid primary key default gen_random_uuid(),
//   tenant_id    uuid not null references tenants(tenant_id) on delete cascade,
//   month        text not null,
//   plan_data    jsonb not null,
//   generated_at timestamptz not null default now()
// );
//
// create index idx_content_plans_tenant on content_plans(tenant_id);
// create index idx_content_plans_month on content_plans(tenant_id, month);
//
// alter table content_plans enable row level security;
//
// create policy "content_plans_tenant_isolation" on content_plans
//   using (tenant_id = current_setting('app.tenant_id', true)::uuid);
// ──────────────────────────────────────────────────────────────
