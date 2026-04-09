"use client";

import type { AssetStatus } from "@/lib/types";

const STATUS_CONFIG: Record<AssetStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-status-draft/20 text-status-draft",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    className: "bg-status-awaiting/20 text-status-awaiting",
  },
  approved: {
    label: "Approved",
    className: "bg-status-approved/20 text-status-approved",
  },
  published: {
    label: "Published",
    className: "bg-status-published/20 text-status-published",
  },
  rejected: {
    label: "Rejected",
    className: "bg-status-rejected/20 text-status-rejected",
  },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
