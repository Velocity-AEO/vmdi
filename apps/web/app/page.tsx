"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Asset, AssetStatus } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface Stats {
  total: number;
  published: number;
  awaiting_approval: number;
  draft: number;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5">
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    published: 0,
    awaiting_approval: 0,
    draft: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAssets()
      .then((res) => {
        const data = res.data;
        setAssets(data);
        setStats({
          total: data.length,
          published: data.filter((a) => a.status === "published").length,
          awaiting_approval: data.filter(
            (a) => a.status === "awaiting_approval"
          ).length,
          draft: data.filter((a) => a.status === "draft").length,
        });
      })
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <Link
          href="/articles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
        >
          New Article
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Articles" value={stats.total} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Awaiting Approval" value={stats.awaiting_approval} />
        <StatCard label="Drafts" value={stats.draft} />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Recent Articles</h3>
        {assets.length === 0 ? (
          <EmptyState
            title="No articles yet"
            description="Create your first article to get started."
            action={
              <Link
                href="/articles/new"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
              >
                New Article
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-bg-surface text-left text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.slice(0, 10).map((asset) => (
                  <tr key={asset.id} className="hover:bg-bg-surface/50">
                    <td className="px-4 py-3 font-medium">{asset.title}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={asset.status as AssetStatus} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {asset.author_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/articles/${asset.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
