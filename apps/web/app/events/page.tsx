"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AssetEvent } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function EventsPage() {
  const [events, setEvents] = useState<AssetEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEvents("")
      .then((res) => setEvents(res.data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Events</h2>

      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Events will appear as articles move through the pipeline." />
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
                {event.asset_id && (
                  <p className="mt-1 text-xs text-text-muted">
                    Asset: {event.asset_id}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0 text-right text-text-muted">
                <p>{event.actor}</p>
                <p>{new Date(event.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
