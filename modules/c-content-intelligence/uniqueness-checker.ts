export interface UniquenessResult {
  score: number;
  isDuplicate: boolean;
  similarAssets: string[];
}

const DUPLICATE_THRESHOLD = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "was", "are",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "can", "this", "that",
  "these", "those", "not", "no", "so", "if", "then", "than", "too",
  "very", "just", "about", "up", "out", "all", "its", "our", "your",
  "their", "we", "you", "he", "she", "they", "me", "him", "her", "us",
  "them", "my", "his", "who", "which", "what", "when", "where", "how",
]);

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

function buildVocabulary(documents: string[][]): string[] {
  const vocab = new Set<string>();
  for (const doc of documents) {
    for (const token of doc) {
      vocab.add(token);
    }
  }
  return Array.from(vocab);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  const len = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / len);
  }
  return tf;
}

function inverseDocumentFrequency(
  documents: string[][],
  vocabulary: string[]
): Map<string, number> {
  const idf = new Map<string, number>();
  const n = documents.length;

  for (const term of vocabulary) {
    let docCount = 0;
    for (const doc of documents) {
      if (doc.includes(term)) {
        docCount++;
      }
    }
    idf.set(term, Math.log((n + 1) / (docCount + 1)) + 1);
  }

  return idf;
}

function tfidfVector(
  tokens: string[],
  vocabulary: string[],
  idf: Map<string, number>
): number[] {
  const tf = termFrequency(tokens);
  return vocabulary.map((term) => {
    return (tf.get(term) ?? 0) * (idf.get(term) ?? 0);
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

function extractTitle(text: string): string {
  const firstLine = text.split("\n")[0].replace(/^#+\s*/, "").trim();
  return firstLine.slice(0, 120) || "Untitled";
}

export async function checkUniqueness(
  content: string,
  existingAssets: string[]
): Promise<UniquenessResult> {
  if (existingAssets.length === 0) {
    return { score: 1, isDuplicate: false, similarAssets: [] };
  }

  const contentTokens = removeStopWords(tokenize(content));
  const assetTokensList = existingAssets.map((a) =>
    removeStopWords(tokenize(a))
  );

  const allDocs = [contentTokens, ...assetTokensList];
  const vocabulary = buildVocabulary(allDocs);
  const idf = inverseDocumentFrequency(allDocs, vocabulary);

  const contentVector = tfidfVector(contentTokens, vocabulary, idf);

  const similarities: { similarity: number; title: string }[] = [];

  for (let i = 0; i < assetTokensList.length; i++) {
    const assetVector = tfidfVector(assetTokensList[i], vocabulary, idf);
    const similarity = cosineSimilarity(contentVector, assetVector);
    similarities.push({
      similarity,
      title: extractTitle(existingAssets[i]),
    });
  }

  similarities.sort((a, b) => b.similarity - a.similarity);

  const maxSimilarity = similarities[0]?.similarity ?? 0;
  const score = parseFloat((1 - maxSimilarity).toFixed(4));

  const similarAssets = similarities
    .filter((s) => s.similarity > 1 - DUPLICATE_THRESHOLD)
    .map((s) => s.title);

  return {
    score,
    isDuplicate: score < DUPLICATE_THRESHOLD,
    similarAssets,
  };
}
