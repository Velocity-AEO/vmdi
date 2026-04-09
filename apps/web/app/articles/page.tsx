"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Asset, AssetStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUSES: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Awaiting Approval", value: "awaiting_approval" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
  { label: "Rejected", value: "rejected" },
];

const TYPES: { label: string; value: string }[] = [
  { label: "All Types", value: "" },
  { label: "Blog Post", value: "blog_post" },
  { label: "Landing Page", value: "landing_page" },
  { label: "Learning Center", value: "learning_center" },
];

export default function ArticlesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  function fetchAssets() {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;

    api
      .getAssets(params)
      .then((res) => setAssets(res.data))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchAssets();
  }, [statusFilter, typeFilter]);

  async function handleStatusChange(id: string, status: string) {
    await api.updateAssetStatus(id, status);
    fetchAssets();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Articles</h2>
        <Link
          href="/articles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          New Article
        </Link>
      </div>

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : assets.length === 0 ? (
        <EmptyState title="No articles found" description="Try adjusting your filters or create a new article." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-bg-surface text-left text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Keyword</th>
                <th className="px-4 py-3 font-medium">Author</th>
                <th className="px-4 py-3 font-medium">Words</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium">{asset.title}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={asset.status as AssetStatus} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {asset.keyword}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {asset.author_name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {asset.word_count}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(asset.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/articles/${asset.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/articles/${asset.id}`}
                        className="text-text-secondary hover:text-text"
                      >
                        Edit
                      </Link>
                      {asset.status === "awaiting_approval" && (
                        <button
                          onClick={() => handleStatusChange(asset.id, "approved")}
                          className="text-status-published hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      {asset.status === "approved" && (
                        <button
                          onClick={() => handleStatusChange(asset.id, "published")}
                          className="text-status-published hover:underline"
                        >
                          Publish
                        </button>
                      )}
                      {asset.status === "awaiting_approval" && (
                        <button
                          onClick={() => handleStatusChange(asset.id, "rejected")}
                          className="text-status-rejected hover:underline"
                        >
                          Reject
                        </button>
                      )}
                    </div>
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
