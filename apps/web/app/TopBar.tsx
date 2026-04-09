"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function TopBar() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .health()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-bg-surface px-6">
      <h1 className="text-sm font-semibold tracking-wide text-text-secondary">
        VMDI &mdash; Content Platform
      </h1>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            healthy === null
              ? "bg-text-muted"
              : healthy
                ? "bg-status-published"
                : "bg-status-rejected"
          }`}
        />
        {healthy === null ? "Checking API..." : healthy ? "API Connected" : "API Offline"}
      </div>
    </header>
  );
}
