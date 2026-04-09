import Anthropic from "@anthropic-ai/sdk";
import { detectAI, type AIDetectionResult } from "./ai-detector.js";

export interface RewriteResult {
  success: boolean;
  content: string;
  attempts: number;
  finalScore: number;
  history: { attempt: number; score: number; signals: string[] }[];
}

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 4096;

function buildRewritePrompt(content: string, detection: AIDetectionResult): string {
  const signalList = detection.signals
    .map((s, i) => `${i + 1}. [${s.severity.toUpperCase()}] ${s.type}: ${s.description}\n   Excerpt: "${s.excerpt}"`)
    .join("\n");

  return `You are rewriting content to remove AI-generated patterns that were detected by our analysis engine. Your job is to fix ONLY the specific issues listed below while preserving the meaning, facts, and keywords.

DETECTED AI SIGNALS (score: ${detection.score}):
${signalList}

REWRITING RULES — apply ONLY what is needed to fix the signals above:
${detection.signals.some((s) => s.type === "transition_phrase_overuse")
    ? '- Remove or replace AI-typical transitions ("Furthermore", "Moreover", "In conclusion", etc.) with natural connectors or restructure sentences to flow without them.'
    : ""}
${detection.signals.some((s) => s.type === "paragraph_uniformity")
    ? "- Vary paragraph lengths. Mix short punchy paragraphs (1-2 sentences) with longer ones (4-6 sentences)."
    : ""}
${detection.signals.some((s) => s.type === "low_sentence_variance")
    ? "- Vary sentence lengths dramatically. Mix short declarative sentences (5-8 words) with longer complex ones (20+ words). Add fragments for emphasis."
    : ""}
${detection.signals.some((s) => s.type === "list_over_reliance")
    ? "- Convert some bullet lists into flowing prose paragraphs. Keep only 1-2 essential lists."
    : ""}
${detection.signals.some((s) => s.type === "generic_opener")
    ? "- Rewrite the opening sentence to start with an anecdote, a bold claim, a question, or a concrete example — not a definition."
    : ""}
${detection.signals.some((s) => s.type === "hedging_language")
    ? '- Replace hedging words ("may", "might", "could", "it is possible") with definitive statements where accurate, or remove the hedge entirely.'
    : ""}
${detection.signals.some((s) => s.type === "excessive_passive_voice")
    ? '- Convert passive voice constructions to active voice. "The report was written by the team" → "The team wrote the report".'
    : ""}
${detection.signals.some((s) => s.type === "no_first_person")
    ? '- Add first-person voice where appropriate ("I", "we", "our") to make the content feel authored by a real person.'
    : ""}
${detection.signals.some((s) => s.type === "zero_contractions")
    ? '- Use natural contractions ("don\'t", "we\'re", "it\'s", "can\'t") where they sound natural.'
    : ""}
${detection.signals.some((s) => s.type === "perfect_grammar")
    ? "- Add a few informal touches: a sentence fragment, a parenthetical aside, or a conversational interjection."
    : ""}
${detection.signals.some((s) => s.type === "keyword_stuffing")
    ? "- Reduce repeated phrases. Use synonyms or pronouns to avoid repetition."
    : ""}
${detection.signals.some((s) => s.type === "overly_formal_vocabulary")
    ? "- Simplify vocabulary. Replace jargon with plain language where possible."
    : ""}
${detection.signals.some((s) => s.type === "no_specifics")
    ? "- Add specific numbers, dates, or named examples where factually appropriate."
    : ""}
${detection.signals.some((s) => s.type === "em_dash_overuse")
    ? "- Reduce em dash usage. Replace some with commas, periods, or parentheses."
    : ""}
${detection.signals.some((s) => s.type === "rhetorical_question_overuse")
    ? "- Reduce rhetorical questions. Convert some to direct statements."
    : ""}

CRITICAL CONSTRAINTS:
- Do NOT add meta-commentary like "Here is the rewritten version"
- Do NOT change factual claims, statistics, or proper nouns
- Do NOT remove or alter keywords/keyphrases — they must remain intact
- Preserve all markdown headings and overall structure
- Return ONLY the rewritten content

CONTENT TO REWRITE:
${content}`;
}

export async function rewriteUntilHuman(
  content: string,
  maxAttempts: number = 3
): Promise<RewriteResult> {
  const history: RewriteResult["history"] = [];
  let currentContent = content;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const detection = await detectAI(currentContent);

    history.push({
      attempt,
      score: detection.score,
      signals: detection.signals.map((s) => s.type),
    });

    if (detection.passesThreshold) {
      return {
        success: true,
        content: currentContent,
        attempts: attempt,
        finalScore: detection.score,
        history,
      };
    }

    // Rewrite using Claude with specific signal instructions
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildRewritePrompt(currentContent, detection),
        },
      ],
    });

    const rewritten = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (rewritten.trim().length > 0) {
      currentContent = rewritten.trim();
    }
  }

  // Final check after last rewrite
  const finalDetection = await detectAI(currentContent);
  history.push({
    attempt: maxAttempts + 1,
    score: finalDetection.score,
    signals: finalDetection.signals.map((s) => s.type),
  });

  return {
    success: finalDetection.passesThreshold,
    content: currentContent,
    attempts: maxAttempts,
    finalScore: finalDetection.score,
    history,
  };
}
