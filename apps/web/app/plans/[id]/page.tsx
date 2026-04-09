"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ContentPlan, PlanItem, Author } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    high: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-text-muted/20 text-text-muted",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[impact] ?? colors.low}`}
    >
      {impact}
    </span>
  );
}

export default function PlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<number | null>(null);
  const [executingAll, setExecutingAll] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [executedItems, setExecutedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([api.getPlan(id), api.getAuthors()])
      .then(([planRes, authorsRes]) => {
        setPlan(planRes.data);
        setAuthors(authorsRes.data);
        if (authorsRes.data.length > 0) {
          setSelectedAuthor(authorsRes.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleExecute(index: number) {
    if (!selectedAuthor) return;
    setExecuting(index);
    try {
      await api.executePlanItem(id, {
        planItemIndex: index,
        authorId: selectedAuthor,
      });
      setExecutedItems((prev) => new Set(prev).add(index));
    } catch (err) {
      console.error("Execute failed:", err);
    } finally {
      setExecuting(null);
    }
  }

  async function handleExecuteAll() {
    if (!plan || !selectedAuthor) return;
    setExecutingAll(true);
    const items = plan.plan_data.items ?? [];
    for (let i = 0; i < items.length; i++) {
      if (executedItems.has(i)) continue;
      setExecuting(i);
      try {
        await api.executePlanItem(id, {
          planItemIndex: i,
          authorId: selectedAuthor,
        });
        setExecutedItems((prev) => new Set(prev).add(i));
      } catch {
        // continue with remaining items
      }
      setExecuting(null);
    }
    setExecutingAll(false);
  }

  if (loading) return <LoadingSpinner />;
  if (!plan) return <p className="text-text-secondary">Plan not found.</p>;

  const items: PlanItem[] = plan.plan_data.items ?? [];
  const summary = plan.plan_data.summary ?? "";

  const weeks = [1, 2, 3, 4];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Plan: {plan.month}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Generated {new Date(plan.generated_at).toLocaleDateString()} &middot;{" "}
            {items.length} article{items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value)}
            className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text"
          >
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExecuteAll}
            disabled={executingAll || !selectedAuthor}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {executingAll ? "Executing..." : "Execute All"}
          </button>
        </div>
      </div>

      {summary && (
        <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
          {summary}
        </div>
      )}

      {weeks.map((week) => {
        const weekItems = items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.week === week);

        if (weekItems.length === 0) return null;

        return (
          <div key={week} className="space-y-3">
            <h3 className="text-lg font-semibold">Week {week}</h3>
            {weekItems.map(({ item, index }) => {
              const isExecuted = executedItems.has(index);
              const isExecuting = executing === index;

              return (
                <div
                  key={index}
                  className={`rounded-lg border bg-bg-surface p-5 space-y-3 ${
                    isExecuted ? "border-status-published/30" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="mt-1 text-sm text-text-secondary">{item.angle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ImpactBadge impact={item.estimatedImpact} />
                      {isExecuted ? (
                        <span className="rounded-md bg-status-published/20 px-3 py-1.5 text-xs font-medium text-status-published">
                          Draft Created
                        </span>
                      ) : (
                        <button
                          onClick={() => handleExecute(index)}
                          disabled={isExecuting || !selectedAuthor}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
                        >
                          {isExecuting ? "Executing..." : "Execute"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-xs text-text-muted">
                    <div>
                      <span className="text-text-secondary">Keyword:</span>{" "}
                      {item.keyword}
                    </div>
                    <div>
                      <span className="text-text-secondary">Audience:</span>{" "}
                      {item.targetAudience}
                    </div>
                    <div>
                      <span className="text-text-secondary">Tone:</span>{" "}
                      {item.tone} &middot; {item.wordCountTarget} words
                    </div>
                  </div>

                  {item.suggestedH2s.length > 0 && (
                    <div className="text-xs text-text-muted">
                      <span className="text-text-secondary">H2s:</span>{" "}
                      {item.suggestedH2s.join(" / ")}
                    </div>
                  )}

                  <p className="text-xs text-text-muted italic">{item.reasoning}</p>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
