"use client";

function getScoreColor(score: number): string {
  if (score < 0.35) return "bg-green-500";
  if (score <= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score < 0.35) return "Good";
  if (score <= 0.6) return "Review";
  return "Flagged";
}

export function ScoreBar({
  score,
  label,
  invertColor = false,
}: {
  score: number;
  label?: string;
  invertColor?: boolean;
}) {
  const displayScore = invertColor ? 1 - score : score;
  const colorClass = invertColor
    ? getScoreColor(1 - score)
    : getScoreColor(score);

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">{label}</span>
          <span className="text-text-secondary">
            {(displayScore * 100).toFixed(0)}% — {invertColor ? getScoreLabel(1 - score) : getScoreLabel(score)}
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-bg-elevated">
        <div
          className={`h-2 rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(displayScore * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
