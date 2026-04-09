"use client";

import type { ReadabilityResult } from "@/lib/editor-api";

interface ReadabilityPanelProps {
  readability: ReadabilityResult;
}

function gradeColor(grade: number): string {
  if (grade <= 10) return "text-green-400";
  if (grade <= 14) return "text-yellow-400";
  return "text-red-400";
}

function passiveColor(ratio: number): string {
  if (ratio < 0.15) return "text-green-400";
  if (ratio <= 0.25) return "text-yellow-400";
  return "text-red-400";
}

function Stat({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${colorClass ?? "text-text"}`}>
        {value}
      </p>
    </div>
  );
}

export function ReadabilityPanel({ readability }: ReadabilityPanelProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Readability
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="FK Grade Level"
          value={readability.fleschKincaidGrade.toFixed(1)}
          colorClass={gradeColor(readability.fleschKincaidGrade)}
        />
        <Stat
          label="Avg Sentence Length"
          value={`${readability.avgSentenceLength.toFixed(1)} words`}
        />
        <Stat
          label="Passive Voice"
          value={`${(readability.passiveVoiceRatio * 100).toFixed(1)}%`}
          colorClass={passiveColor(readability.passiveVoiceRatio)}
        />
        <Stat
          label="Contractions"
          value={String(readability.contractionCount)}
        />
        <Stat
          label="First Person"
          value={String(readability.firstPersonCount)}
        />
        <Stat
          label="Sentence Variance"
          value={readability.sentenceLengthVariance.toFixed(1)}
        />
      </div>
    </div>
  );
}
