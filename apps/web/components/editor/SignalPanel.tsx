"use client";

import type { AIDetectionResult, ReadabilityResult } from "@/lib/editor-api";
import { ReadabilityPanel } from "./ReadabilityPanel";

interface SignalPanelProps {
  detectionResult: AIDetectionResult | null;
  readability: ReadabilityResult | null;
  previousScore: number | null;
  onAutoFix: () => void;
  onRecheck: () => void;
  isLoading: boolean;
}

function severityBadge(severity: "high" | "medium" | "low") {
  const colors = {
    high: "bg-red-500/20 text-red-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${colors[severity]}`}
    >
      {severity}
    </span>
  );
}

function scoreColor(score: number): string {
  if (score < 0.28) return "text-green-400";
  if (score <= 0.55) return "text-yellow-400";
  return "text-red-400";
}

function verdictBadge(verdict: string) {
  const map: Record<string, string> = {
    human: "bg-green-500/20 text-green-400",
    likely_human: "bg-green-500/20 text-green-300",
    likely_ai: "bg-yellow-500/20 text-yellow-400",
    ai: "bg-red-500/20 text-red-400",
  };
  const label = verdict.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${map[verdict] ?? "bg-bg text-text-muted"}`}
    >
      {label}
    </span>
  );
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  transition_phrase_overuse: 0.165,
  paragraph_uniformity: 0.165,
  low_sentence_variance: 0.09,
  list_over_reliance: 0.165,
  generic_opener: 0.15,
  hedging_language: 0.11,
  excessive_passive_voice: 0.11,
  no_first_person: 0.11,
  zero_contractions: 0.11,
  perfect_grammar: 0.11,
  keyword_stuffing: 0.03,
  overly_formal_vocabulary: 0.055,
  no_specifics: 0.055,
  em_dash_overuse: 0.03,
  rhetorical_question_overuse: 0.05,
};

export function SignalPanel({
  detectionResult,
  readability,
  previousScore,
  onAutoFix,
  onRecheck,
  isLoading,
}: SignalPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* Score Display */}
        <div className="text-center">
          {detectionResult ? (
            <>
              <p
                className={`text-5xl font-bold tabular-nums transition-all duration-500 ${scoreColor(detectionResult.score)}`}
              >
                {detectionResult.score.toFixed(2)}
              </p>
              <div className="mt-2">{verdictBadge(detectionResult.verdict)}</div>
              {previousScore !== null && previousScore !== detectionResult.score && (
                <p className="mt-1 text-xs text-text-muted">
                  Previous: {previousScore.toFixed(2)}
                  {detectionResult.score < previousScore ? " ↓" : " ↑"}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">
              Run AI Check to see results
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onRecheck}
            disabled={isLoading}
            className="flex-1 rounded-md bg-primary/20 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/30 disabled:opacity-40 transition-colors"
          >
            {isLoading ? "Checking…" : "Re-run Check"}
          </button>
          <button
            onClick={onAutoFix}
            disabled={isLoading || !detectionResult || detectionResult.passesThreshold}
            className="flex-1 rounded-md bg-status-published/20 px-3 py-2 text-xs font-medium text-status-published hover:bg-status-published/30 disabled:opacity-40 transition-colors"
          >
            {isLoading ? "Fixing…" : "Auto-Fix All"}
          </button>
        </div>

        {/* Signal List */}
        {detectionResult && detectionResult.signals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Signals ({detectionResult.signals.length})
            </h4>
            {detectionResult.signals.map((signal, i) => (
              <div
                key={`${signal.type}-${i}`}
                className="rounded-lg border border-border bg-bg p-3 space-y-1"
              >
                <div className="flex items-center gap-2">
                  {severityBadge(signal.severity)}
                  <span className="text-xs font-medium text-text">
                    {signal.type.replace(/_/g, " ")}
                  </span>
                  <span className="ml-auto text-[10px] text-text-muted">
                    w: {(SIGNAL_WEIGHTS[signal.type] ?? 0).toFixed(3)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {signal.description}
                </p>
                {signal.excerpt && (
                  <p className="text-[11px] text-text-muted italic truncate">
                    "{signal.excerpt}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {detectionResult && detectionResult.signals.length === 0 && (
          <p className="text-center text-sm text-green-400">
            No AI signals detected
          </p>
        )}

        {/* Readability */}
        {readability && <ReadabilityPanel readability={readability} />}
      </div>
    </div>
  );
}
