import { analyzeReadability } from "./readability.js";
import { analyzeWithGoogleNLP, type GoogleNLPResult } from "./nlp/google-nlp-analyzer.js";
import { computeCompositeScore, type CompositeScore } from "./nlp/composite-scorer.js";

export interface AISignal {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  excerpt: string;
}

export interface AIDetectionResult {
  score: number;
  confidence: "low" | "medium" | "high";
  verdict: "human" | "likely_human" | "likely_ai" | "ai";
  signals: AISignal[];
  passesThreshold: boolean;
  patternScore: number;
  nlpResult: GoogleNLPResult | null;
  compositeScore: CompositeScore;
}

const TRANSITION_PHRASES = [
  "furthermore",
  "moreover",
  "in conclusion",
  "it's worth noting",
  "it's important to",
  "it is worth noting",
  "it is important to",
  "notably",
  "importantly",
  "significantly",
];

const HEDGING_PHRASES = [
  "it is possible",
  "in some cases",
];

const HEDGING_WORDS = ["may", "might", "could"];

// ── Helpers ──────────────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>\[\]()]/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "");
}

function getWords(text: string): string[] {
  return stripMarkdown(text)
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function getSentences(text: string): string[] {
  const cleaned = stripMarkdown(text);
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.split(/\s+/).length >= 2);
}

function getParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.match(/^#{1,6}\s/));
}

function truncateExcerpt(text: string, maxLen: number = 120): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

// ── HIGH WEIGHT signals (0.15 each) ─────────────────────────

function checkTransitionPhraseOveruse(text: string, words: string[]): AISignal | null {
  const lower = text.toLowerCase();
  let count = 0;
  const found: string[] = [];
  for (const phrase of TRANSITION_PHRASES) {
    const regex = new RegExp(`\\b${phrase.replace(/'/g, "['']")}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) {
      count += matches.length;
      found.push(phrase);
    }
  }
  // Trigger if more than 2 transition phrases per 500 words
  const ratio = count / (words.length / 500);
  if (ratio > 2) {
    return {
      type: "transition_phrase_overuse",
      description: `Overuse of AI-typical transition phrases (${count} found): ${found.join(", ")}`,
      severity: "high",
      excerpt: truncateExcerpt(found.map((f) => `"${f}"`).join(", ")),
    };
  }
  return null;
}

function checkParagraphUniformity(paragraphs: string[]): AISignal | null {
  if (paragraphs.length < 3) return null;
  const lengths = paragraphs.map((p) => p.split(/\s+/).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (avg === 0) return null;
  const allWithin20 = lengths.every(
    (len) => Math.abs(len - avg) / avg <= 0.2
  );
  if (allWithin20) {
    return {
      type: "paragraph_uniformity",
      description: `All ${paragraphs.length} paragraphs are within 20% of average length (${Math.round(avg)} words)`,
      severity: "high",
      excerpt: `Paragraph lengths: ${lengths.join(", ")} words`,
    };
  }
  return null;
}

function checkSentenceLengthVariance(sentenceLengthStddev: number): AISignal | null {
  if (sentenceLengthStddev < 8) {
    return {
      type: "low_sentence_variance",
      description: `Sentence length standard deviation is ${sentenceLengthStddev} (threshold: 8). AI tends to produce uniform sentence lengths.`,
      severity: "high",
      excerpt: `stddev = ${sentenceLengthStddev} words`,
    };
  }
  return null;
}

function checkListOverReliance(text: string, words: string[]): AISignal | null {
  const listLines = text.split("\n").filter((line) =>
    /^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)
  );
  const listWords = listLines.reduce(
    (sum, line) => sum + line.split(/\s+/).filter((w) => w.length > 0).length,
    0
  );
  const ratio = listWords / (words.length || 1);
  if (ratio > 0.4) {
    return {
      type: "list_over_reliance",
      description: `${Math.round(ratio * 100)}% of content is in bullet/numbered lists (threshold: 40%)`,
      severity: "high",
      excerpt: truncateExcerpt(listLines.slice(0, 3).join("\n")),
    };
  }
  return null;
}

function checkGenericOpener(text: string): AISignal | null {
  const sentences = getSentences(text);
  if (sentences.length === 0) return null;
  const first = sentences[0].trim();
  // "X is a...", "X refers to...", "X is the..."
  const genericPattern = /^[\w\s-]+\b(?:is a|is an|is the|refers to|can be defined as|is defined as)\b/i;
  if (genericPattern.test(first)) {
    return {
      type: "generic_opener",
      description: "First sentence uses a generic definition pattern typical of AI-generated content",
      severity: "high",
      excerpt: truncateExcerpt(first),
    };
  }
  return null;
}

// ── MEDIUM WEIGHT signals (0.10 each) ───────────────────────

function checkHedgingDensity(text: string, words: string[]): AISignal | null {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of HEDGING_PHRASES) {
    const regex = new RegExp(`\\b${phrase}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  for (const word of HEDGING_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) count += matches.length;
  }
  const ratio = count / (words.length || 1);
  if (ratio > 0.03) {
    return {
      type: "hedging_language",
      description: `Hedging language density is ${(ratio * 100).toFixed(1)}% (threshold: 3%)`,
      severity: "medium",
      excerpt: `${count} hedging instances in ${words.length} words`,
    };
  }
  return null;
}

function checkPassiveVoice(passiveRatio: number): AISignal | null {
  if (passiveRatio > 0.25) {
    return {
      type: "excessive_passive_voice",
      description: `Passive voice ratio is ${(passiveRatio * 100).toFixed(1)}% (threshold: 25%)`,
      severity: "medium",
      excerpt: `${(passiveRatio * 100).toFixed(1)}% of sentences use passive voice`,
    };
  }
  return null;
}

function checkNoFirstPerson(firstPersonCount: number): AISignal | null {
  if (firstPersonCount === 0) {
    return {
      type: "no_first_person",
      description: 'No first-person pronouns found. AI content typically avoids "I", "we", "our", "my".',
      severity: "medium",
      excerpt: "Zero first-person pronouns in entire content",
    };
  }
  return null;
}

function checkZeroContractions(contractionCount: number, wordCount: number): AISignal | null {
  // Only flag for conversational-length content (300+ words)
  if (wordCount >= 300 && contractionCount === 0) {
    return {
      type: "zero_contractions",
      description: `No contractions found in ${wordCount} words. Natural writing typically includes contractions.`,
      severity: "medium",
      excerpt: "Zero contractions detected",
    };
  }
  return null;
}

function checkPerfectGrammar(text: string): AISignal | null {
  const sentences = getSentences(text);
  if (sentences.length < 5) return null;

  // Check for fragments, rhetorical questions, colloquialisms
  let humanMarkers = 0;
  for (const sentence of sentences) {
    // Sentence fragments (very short, no verb indicators)
    if (sentence.split(/\s+/).length <= 4 && !sentence.includes("?")) humanMarkers++;
    // Parenthetical asides
    if (/\(.*?\)/.test(sentence)) humanMarkers++;
    // Interjections / informal markers
    if (/\b(?:well|honestly|look|okay|sure|right|yeah|oh|hey|so)\b/i.test(sentence)) humanMarkers++;
    // Em dashes used as asides
    if (/—/.test(sentence)) humanMarkers++;
  }

  if (humanMarkers === 0) {
    return {
      type: "perfect_grammar",
      description: "No sentence fragments, rhetorical devices, or colloquialisms detected. Content appears overly polished.",
      severity: "medium",
      excerpt: "Zero informal grammar markers across all sentences",
    };
  }
  return null;
}

// ── LOW WEIGHT signals (0.05 each) ──────────────────────────

function checkKeywordStuffing(words: string[]): AISignal | null {
  if (words.length < 20) return null;

  // Build bigram and trigram frequency
  const phraseCount = new Map<string, number>();
  const lower = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, ""));

  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= lower.length - n; i++) {
      const phrase = lower.slice(i, i + n).join(" ");
      phraseCount.set(phrase, (phraseCount.get(phrase) ?? 0) + 1);
    }
  }

  // Check per 500-word window
  const windowSize = Math.min(500, words.length);
  const threshold = 3;
  for (const [phrase, count] of phraseCount) {
    const scaledCount = count * (windowSize / words.length);
    if (scaledCount > threshold) {
      return {
        type: "keyword_stuffing",
        description: `Phrase "${phrase}" appears ${count} times (>${threshold} per 500 words)`,
        severity: "low",
        excerpt: `"${phrase}" × ${count}`,
      };
    }
  }
  return null;
}

function checkOverlyFormalVocabulary(fleschKincaidGrade: number): AISignal | null {
  if (fleschKincaidGrade > 14) {
    return {
      type: "overly_formal_vocabulary",
      description: `Flesch-Kincaid grade level is ${fleschKincaidGrade} (threshold: 14). Content is unusually complex.`,
      severity: "low",
      excerpt: `Grade level: ${fleschKincaidGrade}`,
    };
  }
  return null;
}

function checkNoSpecifics(text: string): AISignal | null {
  // Look for dates, specific numbers, named examples
  const hasDate = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}/i.test(text) ||
    /\b\d{4}\b/.test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text);
  const hasSpecificNumber = /\b\d+(?:\.\d+)?%\b/.test(text) || /\$\d/.test(text) || /\b\d{2,}\b/.test(text);
  const hasNamedExample = /\b(?:for example|for instance|such as|like)\s+[A-Z][a-z]+/i.test(text);

  if (!hasDate && !hasSpecificNumber && !hasNamedExample) {
    return {
      type: "no_specifics",
      description: "No specific dates, numbers, percentages, or named examples found. AI content tends to stay abstract.",
      severity: "low",
      excerpt: "No concrete data points or named examples detected",
    };
  }
  return null;
}

function checkEmDashOveruse(text: string, words: string[]): AISignal | null {
  const emDashCount = (text.match(/—/g) || []).length;
  const ratio = emDashCount / (words.length / 200);
  if (ratio > 1 && emDashCount > 1) {
    return {
      type: "em_dash_overuse",
      description: `${emDashCount} em dashes in ${words.length} words (threshold: 1 per 200 words)`,
      severity: "low",
      excerpt: `${emDashCount} em dashes detected`,
    };
  }
  return null;
}

function checkRhetoricalQuestionOveruse(text: string, words: string[]): AISignal | null {
  const questions = getSentences(text).filter((s) => s.trim().endsWith("?"));
  // Filter to likely rhetorical (not genuine interrogative in context)
  const ratio = questions.length / (words.length / 500);
  if (ratio > 2 && questions.length > 2) {
    return {
      type: "rhetorical_question_overuse",
      description: `${questions.length} questions in ${words.length} words (threshold: 2 per 500 words)`,
      severity: "low",
      excerpt: truncateExcerpt(questions.slice(0, 2).join(" | ")),
    };
  }
  return null;
}

// ── Scoring ─────────────────────────────────────────────────

const WEIGHT: Record<AISignal["severity"], number> = {
  high: 0.15,
  medium: 0.10,
  low: 0.05,
};

function classify(score: number): {
  verdict: AIDetectionResult["verdict"];
  confidence: AIDetectionResult["confidence"];
} {
  if (score < 0.20) return { verdict: "human", confidence: "high" };
  if (score <= 0.35) return { verdict: "likely_human", confidence: "medium" };
  if (score <= 0.60) return { verdict: "likely_ai", confidence: "medium" };
  return { verdict: "ai", confidence: "high" };
}

// ── Main ────────────────────────────────────────────────────

export async function detectAI(content: string): Promise<AIDetectionResult> {
  const words = getWords(content);
  const paragraphs = getParagraphs(content);
  const readability = analyzeReadability(content);

  const signals: AISignal[] = [];

  // HIGH weight checks
  const highChecks = [
    checkTransitionPhraseOveruse(content, words),
    checkParagraphUniformity(paragraphs),
    checkSentenceLengthVariance(readability.sentenceLengthVariance),
    checkListOverReliance(content, words),
    checkGenericOpener(content),
  ];

  // MEDIUM weight checks
  const mediumChecks = [
    checkHedgingDensity(content, words),
    checkPassiveVoice(readability.passiveVoiceRatio),
    checkNoFirstPerson(readability.firstPersonCount),
    checkZeroContractions(readability.contractionCount, words.length),
    checkPerfectGrammar(content),
  ];

  // LOW weight checks
  const lowChecks = [
    checkKeywordStuffing(words),
    checkOverlyFormalVocabulary(readability.fleschKincaidGrade),
    checkNoSpecifics(content),
    checkEmDashOveruse(content, words),
    checkRhetoricalQuestionOveruse(content, words),
  ];

  for (const signal of [...highChecks, ...mediumChecks, ...lowChecks]) {
    if (signal) signals.push(signal);
  }

  // Sum weighted scores, cap at 1.0
  const rawScore = signals.reduce((sum, s) => sum + WEIGHT[s.severity], 0);
  const patternScore = Math.round(Math.min(1, rawScore) * 100) / 100;

  // Secondary verification: Google NLP analysis
  const nlpResult = await analyzeWithGoogleNLP(content);

  // Combine pattern + NLP into composite verdict
  const composite = computeCompositeScore(patternScore, nlpResult);

  return {
    score: composite.finalScore,
    confidence: composite.confidence,
    verdict: composite.verdict,
    signals,
    passesThreshold: composite.passesThreshold,
    patternScore,
    nlpResult,
    compositeScore: composite,
  };
}
