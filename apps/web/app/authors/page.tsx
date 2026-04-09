"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Author } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAuthors()
      .then((res) => setAuthors(res.data))
      .catch(() => setAuthors([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  if (authors.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Authors</h2>
        <EmptyState title="No authors yet" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Authors</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-surface text-left text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {authors.map((author) => (
              <tr key={author.id} className="hover:bg-bg-surface/50">
                <td className="px-4 py-3 font-medium">{author.name}</td>
                <td className="px-4 py-3 text-text-secondary">{author.email}</td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(author.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
