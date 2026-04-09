"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Keyword } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

const INTENTS = [
  "informational",
  "navigational",
  "commercial",
  "transactional",
];

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [intent, setIntent] = useState(INTENTS[0]);
  const [cluster, setCluster] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function fetchKeywords() {
    setLoading(true);
    api
      .getKeywords()
      .then((res) => setKeywords(res.data))
      .catch(() => setKeywords([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchKeywords();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createKeyword({ keyword, intent, cluster });
      setKeyword("");
      setCluster("");
      setShowForm(false);
      fetchKeywords();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Keywords</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          {showForm ? "Cancel" : "Add Keyword"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-surface p-5 space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted"
              placeholder="e.g. content marketing strategy"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Intent</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            >
              {INTENTS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Cluster</label>
            <input
              type="text"
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted"
              placeholder="e.g. content-strategy"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !keyword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
          >
            {submitting ? "Adding..." : "Add Keyword"}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : keywords.length === 0 ? (
        <EmptyState title="No keywords yet" description="Add your first keyword to start targeting." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Intent</th>
                <th className="px-4 py-3 font-medium">Cluster</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {kw.intent}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {kw.cluster || "—"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(kw.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
