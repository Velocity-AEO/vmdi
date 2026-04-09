"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import {
  recheckContent,
  autoFixContent,
  saveArticleBody,
  type AIDetectionResult,
  type ReadabilityResult,
} from "@/lib/editor-api";
import {
  RichTextEditor,
  type EditorHighlight,
} from "@/components/editor/RichTextEditor";
import { SignalPanel } from "@/components/editor/SignalPanel";

function buildHighlights(
  detection: AIDetectionResult | null
): EditorHighlight[] {
  if (!detection) return [];
  return detection.signals.map((signal) => ({
    text: signal.excerpt,
    severity: signal.severity,
    signal: signal.type,
    description: signal.description,
    suggestion: suggestionFor(signal.type),
  }));
}

function suggestionFor(signalType: string): string {
  const map: Record<string, string> = {
    transition_phrase_overuse:
      "Remove or replace generic transitions with natural connectors.",
    paragraph_uniformity:
      "Vary paragraph lengths — mix short and long paragraphs.",
    low_sentence_variance:
      "Mix short (5-8 word) and long (20+ word) sentences.",
    list_over_reliance:
      "Convert some bullet lists into flowing prose.",
    generic_opener:
      "Replace the definition-style opener with an anecdote or bold claim.",
    hedging_language:
      'Replace "may", "might", "could" with definitive statements.',
    excessive_passive_voice:
      "Convert passive constructions to active voice.",
    no_first_person:
      'Add first-person pronouns ("we", "our") where natural.',
    zero_contractions:
      'Use contractions ("don\'t", "we\'re") where they sound natural.',
    perfect_grammar:
      "Add informal touches — a fragment, parenthetical, or interjection.",
    keyword_stuffing:
      "Use synonyms or pronouns to reduce repetition.",
    overly_formal_vocabulary:
      "Simplify vocabulary — replace jargon with plain language.",
    no_specifics:
      "Add specific numbers, dates, or named examples.",
    em_dash_overuse:
      "Replace some em dashes with commas or periods.",
    rhetorical_question_overuse:
      "Convert some questions to direct statements.",
  };
  return map[signalType] ?? "Review and revise this section.";
}

export default function AIEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [body, setBody] = useState("");
  const [detection, setDetection] = useState<AIDetectionResult | null>(null);
  const [readability, setReadability] = useState<ReadabilityResult | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    api
      .getAsset(id)
      .then((a) => {
        setAsset(a);
        setBody(a.body ?? "");
        if (a.ai_detection_score !== null) {
          setPreviousScore(a.ai_detection_score);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecheck = useCallback(async () => {
    setChecking(true);
    try {
      if (detection) {
        setPreviousScore(detection.score);
      }
      const result = await recheckContent(id, body);
      setDetection(result.detection);
      setReadability(result.readability);
    } catch (err) {
      console.error("Recheck failed:", err);
    } finally {
      setChecking(false);
    }
  }, [id, body, detection]);

  const handleAutoFix = useCallback(async () => {
    setChecking(true);
    try {
      if (detection) {
        setPreviousScore(detection.score);
      }
      const result = await autoFixContent(id, body);
      setBody(result.fixedContent);
      const recheck = await recheckContent(id, result.fixedContent);
      setDetection(recheck.detection);
      setReadability(recheck.readability);
    } catch (err) {
      console.error("Auto-fix failed:", err);
    } finally {
      setChecking(false);
    }
  }, [id, body, detection]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      await saveArticleBody(id, body);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [id, body]);

  const highlights = buildHighlights(detection);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <p className="text-text-secondary">Article not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      {/* Top Bar */}
      <header className="flex h-14 flex-shrink-0 items-center gap-4 border-b border-border bg-bg-surface px-4">
        <button
          onClick={() => router.push(`/articles/${id}`)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-text-secondary hover:text-text hover:bg-bg-elevated transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="flex-shrink-0"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{asset.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="text-xs text-green-400">Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-400">Save failed</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text hover:bg-border transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="rounded-md bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/30 transition-colors disabled:opacity-40"
          >
            {checking ? "Checking…" : "Run AI Check"}
          </button>
          <button
            onClick={() => router.push(`/articles/${id}`)}
            className="rounded-md bg-status-published/20 px-3 py-1.5 text-xs font-medium text-status-published hover:bg-status-published/30 transition-colors"
          >
            Publish
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Editor */}
        <div className="flex w-[60%] flex-col border-r border-border">
          <div className="flex-1 overflow-hidden">
            <RichTextEditor
              value={body}
              onChange={setBody}
              highlights={highlights}
            />
          </div>
        </div>

        {/* Right Panel: AI Analysis */}
        <div className="w-[40%] bg-bg-surface">
          <SignalPanel
            detectionResult={detection}
            readability={readability}
            previousScore={previousScore}
            onAutoFix={handleAutoFix}
            onRecheck={handleRecheck}
            isLoading={checking}
          />
        </div>
      </div>
    </div>
  );
}
