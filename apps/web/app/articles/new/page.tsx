"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Keyword, Author, Tone, Asset } from "@/lib/types";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

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

export default function NewArticlePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<"write" | "upload">("write");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [selectedTone, setSelectedTone] = useState<Tone>("professional");
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<Asset | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getKeywords().then((res) => setKeywords(res.data)).catch(() => {});
    api.getAuthors().then((res) => setAuthors(res.data)).catch(() => {});
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const asset = await api.createAsset({
        topic,
        method,
        keyword_id: selectedKeyword,
        tone: selectedTone,
        author_id: selectedAuthor,
      });
      setGeneratedAsset(asset);
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!generatedAsset) return;
    await api.updateAssetStatus(generatedAsset.id, "draft");
    router.push("/articles");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold">New Article</h2>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              s <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Method */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Choose Method</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => { setMethod("write"); setStep(2); }}
              className="rounded-lg border border-border bg-bg-surface p-6 text-left hover:border-primary transition-colors"
            >
              <p className="font-medium">Write Topic</p>
              <p className="mt-1 text-sm text-text-secondary">
                Describe a topic and generate an article
              </p>
            </button>
            <button
              onClick={() => { setMethod("upload"); setStep(2); }}
              className="rounded-lg border border-border bg-bg-surface p-6 text-left hover:border-primary transition-colors"
            >
              <p className="font-medium">Upload Document</p>
              <p className="mt-1 text-sm text-text-secondary">
                Upload raw content to humanize and optimize
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Keyword */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Keyword</h3>
          {method === "write" && (
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Topic</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted"
                rows={3}
                placeholder="Describe the article topic..."
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Primary Keyword</label>
            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="">Select a keyword...</option>
              {keywords.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.keyword} ({k.intent})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-text-secondary hover:text-text">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedKeyword}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Tone */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Tone</h3>
          <div className="grid grid-cols-3 gap-3">
            {(["professional", "conversational", "educational"] as Tone[]).map(
              (tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`rounded-lg border p-4 text-left text-sm font-medium capitalize transition-colors ${
                    selectedTone === tone
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-bg-surface text-text hover:border-border-hover"
                  }`}
                >
                  {tone}
                </button>
              )
            )}
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-text-secondary hover:text-text">
              Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Author */}
      {step === 4 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select Author</h3>
          <select
            value={selectedAuthor}
            onChange={(e) => setSelectedAuthor(e.target.value)}
            className="w-full rounded-md border border-border bg-bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">Select an author...</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="text-sm text-text-secondary hover:text-text">
              Back
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={!selectedAuthor}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Generate */}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generate Article</h3>
          <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm space-y-2">
            <p><span className="text-text-secondary">Method:</span> {method === "write" ? "Write from topic" : "Upload document"}</p>
            {topic && <p><span className="text-text-secondary">Topic:</span> {topic}</p>}
            <p><span className="text-text-secondary">Keyword:</span> {keywords.find((k) => k.id === selectedKeyword)?.keyword}</p>
            <p><span className="text-text-secondary">Tone:</span> {selectedTone}</p>
            <p><span className="text-text-secondary">Author:</span> {authors.find((a) => a.id === selectedAuthor)?.name}</p>
          </div>
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(4)} className="text-sm text-text-secondary hover:text-text">
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-40 transition-colors"
            >
              {generating ? "Generating..." : "Generate"}
            </button>
          </div>
          {generating && <LoadingSpinner />}
        </div>
      )}

      {/* Step 6: Preview */}
      {step === 6 && generatedAsset && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Preview</h3>

          {generatedAsset.ai_detection_score !== null && (
            <div>
              <p className="mb-2 text-sm text-text-secondary">AI Detection Score</p>
              <AiScoreBadge score={generatedAsset.ai_detection_score} />
            </div>
          )}

          <div className="rounded-lg border border-border bg-bg-surface p-6">
            <h4 className="mb-4 text-xl font-bold">{generatedAsset.title}</h4>
            <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
              {generatedAsset.body}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(5)}
              className="text-sm text-text-secondary hover:text-text"
            >
              Regenerate
            </button>
            <button
              onClick={handleSaveDraft}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Save as Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
