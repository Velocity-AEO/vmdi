import {
  detectAI as runDetectAI,
  analyzeReadability as runAnalyzeReadability,
  rewriteUntilHuman,
  type AIDetectionResult,
  type ReadabilityResult,
  type RewriteResult,
} from "@vmdi/content-intelligence";

export type { AIDetectionResult, ReadabilityResult, RewriteResult };

export async function detectAI(content: string): Promise<{
  detection: AIDetectionResult;
  readability: ReadabilityResult;
}> {
  const [detection, readability] = await Promise.all([
    runDetectAI(content),
    Promise.resolve(runAnalyzeReadability(content)),
  ]);

  return { detection, readability };
}

export async function rewriteContent(
  content: string,
  maxAttempts: number = 3
): Promise<RewriteResult> {
  return rewriteUntilHuman(content, maxAttempts);
}
