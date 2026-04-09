"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ContentPlan } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PlansPage() {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  function fetchPlans() {
    setLoading(true);
    api
      .getPlans()
      .then((res) => setPlans(res.data))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      await api.generatePlan({ tenantId: "", month });
      setShowModal(false);
      fetchPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Content Plans</h2>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          Generate Plan
        </button>
      </div>

      {/* Generate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-bg-surface p-6 space-y-4">
            <h3 className="text-lg font-semibold">Generate Monthly Plan</h3>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>
            {error && (
              <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm text-text-secondary hover:text-text"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
            </div>
            {generating && <LoadingSpinner size="sm" />}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No content plans yet"
          description="Generate your first monthly content plan."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Articles</th>
                <th className="px-4 py-3 font-medium">Generated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((plan) => {
                const itemCount = plan.plan_data?.items?.length ?? 0;
                return (
                  <tr key={plan.plan_id} className="hover:bg-bg-surface/50">
                    <td className="px-4 py-3 font-medium">{plan.month}</td>
                    <td className="px-4 py-3 text-text-secondary">
                      {itemCount} article{itemCount !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(plan.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/plans/${plan.plan_id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
