"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Asset, AssetEvent } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function AiScoreBadge({ score }: { score: number }) {
  if (score < 0.35) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-500/20 px-3 py-1 text-sm font-medium text-green-400">
        {(score * 100).toFixed(0)}% — Passes — Human
      </span>
    );
  }
  if (score <= 0.6) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-sm font-medium text-yellow-400">
        {(score * 100).toFixed(0)}% — Borderline — Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400">
      {(score * 100).toFixed(0)}% — Flagged — AI Detected
    </span>
  );
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  function fetchData() {
    setLoading(true);
    Promise.all([api.getAsset(id), api.getEvents(id)])
      .then(([assetData, eventsData]) => {
        setAsset(assetData);
        setEvents(eventsData.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  async function handleStatusChange(status: string) {
    setActionLoading(true);
    try {
      const updated = await api.updateAssetStatus(id, status);
      setAsset(updated);
      const eventsData = await api.getEvents(id);
      setEvents(eventsData.data);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!asset) return <p className="text-text-secondary">Article not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{asset.title}</h2>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={asset.status} />
            <span className="text-sm text-text-secondary">by {asset.author_name}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/articles/${id}/edit`)}
            className="rounded-md bg-primary/20 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/30 transition-colors"
          >
            Edit in AI Editor
          </button>
          {asset.status === "draft" && (
            <button
              onClick={() => handleStatusChange("awaiting_approval")}
              disabled={actionLoading}
              className="rounded-md bg-status-awaiting/20 px-4 py-2 text-sm font-medium text-status-awaiting hover:bg-status-awaiting/30 disabled:opacity-40 transition-colors"
            >
              Submit for Approval
            </button>
          )}
          {asset.status === "awaiting_approval" && (
            <>
              <button
                onClick={() => handleStatusChange("approved")}
                disabled={actionLoading}
                className="rounded-md bg-status-approved/20 px-4 py-2 text-sm font-medium text-status-approved hover:bg-status-approved/30 disabled:opacity-40 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange("rejected")}
                disabled={actionLoading}
                className="rounded-md bg-status-rejected/20 px-4 py-2 text-sm font-medium text-status-rejected hover:bg-status-rejected/30 disabled:opacity-40 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {asset.status === "approved" && (
            <button
              onClick={() => handleStatusChange("published")}
              disabled={actionLoading}
              className="rounded-md bg-status-published/20 px-4 py-2 text-sm font-medium text-status-published hover:bg-status-published/30 disabled:opacity-40 transition-colors"
            >
              Publish Now
            </button>
          )}
          {asset.status === "published" && asset.published_url && (
            <a
              href={asset.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-status-published/20 px-4 py-2 text-sm font-medium text-status-published hover:bg-status-published/30 transition-colors"
            >
              View Live
            </a>
          )}
        </div>
      </div>

      {/* Metadata Panel */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-bg-surface p-5 text-sm md:grid-cols-4">
        <div>
          <p className="text-text-muted">Keyword</p>
          <p className="mt-0.5 font-medium">{asset.keyword}</p>
        </div>
        <div>
          <p className="text-text-muted">Word Count</p>
          <p className="mt-0.5 font-medium">{asset.word_count}</p>
        </div>
        <div>
          <p className="text-text-muted">Created</p>
          <p className="mt-0.5 font-medium">{new Date(asset.created_at).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-text-muted">Published</p>
          <p className="mt-0.5 font-medium">
            {asset.published_at ? new Date(asset.published_at).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4">
        {asset.ai_detection_score !== null && (
          <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-3">
            <p className="text-sm font-medium">AI Detection Score</p>
            <AiScoreBadge score={asset.ai_detection_score} />
            <ScoreBar score={asset.ai_detection_score} label="AI Detection" />
          </div>
        )}
        {asset.uniqueness_score !== null && (
          <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-3">
            <p className="text-sm font-medium">Uniqueness Score</p>
            <p className="text-2xl font-bold text-status-published">
              {(asset.uniqueness_score * 100).toFixed(0)}%
            </p>
            <ScoreBar
              score={1 - asset.uniqueness_score}
              label="Uniqueness"
              invertColor
            />
          </div>
        )}
      </div>

      {/* Article Body */}
      <div className="rounded-lg border border-border bg-bg-surface p-6">
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {asset.body}
        </div>
      </div>

      {/* Events Timeline */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-text-muted">No events recorded.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface px-4 py-3 text-sm"
              >
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                <div className="flex-1">
                  <p className="font-medium">{event.event_type}</p>
                  <p className="text-text-secondary">{event.description}</p>
                </div>
                <div className="flex-shrink-0 text-text-muted">
                  <p>{event.actor}</p>
                  <p>{new Date(event.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
