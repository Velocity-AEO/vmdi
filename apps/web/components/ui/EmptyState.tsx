"use client";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-bg-surface px-6 py-16 text-center">
      <div className="mb-2 text-4xl text-text-muted">&#9744;</div>
      <h3 className="text-lg font-medium text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
