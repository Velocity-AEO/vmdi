export interface ReadabilityResult {
  fleschKincaidGrade: number;
  avgSentenceLength: number;
  avgWordLength: number;
  passiveVoiceRatio: number;
  sentenceLengthVariance: number;
  paragraphCount: number;
  avgParagraphLength: number;
  contractionCount: number;
  firstPersonCount: number;
}

/** Split text into sentences, handling abbreviations and decimals. */
function splitSentences(text: string): string[] {
  // Remove markdown headings
  const cleaned = text.replace(/^#{1,6}\s+.+$/gm, "");
  // Split on sentence-ending punctuation followed by whitespace or end
  const raw = cleaned.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.split(/\s+/).length >= 2);
}

/** Split text into words. */
function splitWords(text: string): string[] {
  // Strip markdown, punctuation but keep apostrophes inside words
  const cleaned = text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>\[\]()]/g, "")
    .replace(/[^\w\s'-]/g, " ");
  return cleaned.split(/\s+/).filter((w) => w.length > 0);
}

/** Count syllables in a word (approximation). */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return 1;

  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Silent e at end
  if (w.endsWith("e") && !w.endsWith("le")) {
    count = Math.max(1, count - 1);
  }
  // -ed endings that don't add syllable
  if (w.endsWith("ed") && !w.endsWith("ted") && !w.endsWith("ded")) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}

/** Split into paragraphs (non-empty blocks). */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !p.match(/^#{1,6}\s/));
}

/** Detect passive voice patterns. Returns count. */
function countPassiveVoice(sentences: string[]): number {
  // "is/was/were/are/been/being/be" + optional adverb + past participle
  const passiveRegex =
    /\b(?:is|was|were|are|been|being|be|am|has been|have been|had been|will be|would be|could be|should be|might be|must be)\s+(?:\w+ly\s+)?(\w+ed|written|taken|made|done|given|shown|known|found|seen|told|built|sent|held|run|set|put|read|grown|drawn|broken|spoken|chosen|driven|fallen|forgotten|hidden|risen|stolen|sworn|torn|worn|woven)\b/gi;

  let count = 0;
  for (const sentence of sentences) {
    const matches = sentence.match(passiveRegex);
    if (matches) count += matches.length;
  }
  return count;
}

/** Count contractions. */
function countContractions(text: string): number {
  const contractionRegex =
    /\b(?:I'm|I've|I'll|I'd|we're|we've|we'll|we'd|you're|you've|you'll|you'd|they're|they've|they'll|they'd|he's|she's|it's|that's|who's|what's|where's|there's|here's|how's|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|won't|wouldn't|can't|couldn't|shouldn't|doesn't|didn't|don't|mustn't|let's|ain't)\b/gi;
  const matches = text.match(contractionRegex);
  return matches ? matches.length : 0;
}

/** Count first-person pronouns. */
function countFirstPerson(text: string): number {
  const firstPersonRegex = /\b(?:I|we|our|my|me|us|myself|ourselves)\b/g;
  const matches = text.match(firstPersonRegex);
  return matches ? matches.length : 0;
}

export function analyzeReadability(content: string): ReadabilityResult {
  const sentences = splitSentences(content);
  const words = splitWords(content);
  const paragraphs = splitParagraphs(content);

  const totalWords = words.length;
  const totalSentences = sentences.length || 1;

  // Avg sentence length
  const sentenceLengths = sentences.map((s) => s.split(/\s+/).length);
  const avgSentenceLength = totalWords / totalSentences;

  // Avg word length (in characters)
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, "").length, 0);
  const avgWordLength = totalChars / (totalWords || 1);

  // Syllable count for Flesch-Kincaid
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / (totalWords || 1)) -
    15.59;

  // Sentence length variance (standard deviation)
  const mean = sentenceLengths.reduce((a, b) => a + b, 0) / (sentenceLengths.length || 1);
  const variance =
    sentenceLengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) /
    (sentenceLengths.length || 1);
  const sentenceLengthVariance = Math.sqrt(variance);

  // Passive voice ratio
  const passiveCount = countPassiveVoice(sentences);
  const passiveVoiceRatio = passiveCount / totalSentences;

  // Paragraph stats
  const paragraphCount = paragraphs.length;
  const paragraphWordCounts = paragraphs.map((p) => p.split(/\s+/).length);
  const avgParagraphLength =
    paragraphWordCounts.reduce((a, b) => a + b, 0) / (paragraphCount || 1);

  return {
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    avgWordLength: Math.round(avgWordLength * 100) / 100,
    passiveVoiceRatio: Math.round(passiveVoiceRatio * 1000) / 1000,
    sentenceLengthVariance: Math.round(sentenceLengthVariance * 100) / 100,
    paragraphCount,
    avgParagraphLength: Math.round(avgParagraphLength * 100) / 100,
    contractionCount: countContractions(content),
    firstPersonCount: countFirstPerson(content),
  };
}
