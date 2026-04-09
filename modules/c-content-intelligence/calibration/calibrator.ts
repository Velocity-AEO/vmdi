import { detectAI, type AIDetectionResult, type AISignal } from "../ai-detector.js";
import { HUMAN_SAMPLES, AI_SAMPLES, type CorpusSample } from "./sample-corpus.js";

export interface SignalStats {
  signalType: string;
  triggeredCount: number;
  correctWhenTriggered: number;
  effectiveness: number;
  falsePositiveCount: number;
}

export interface CalibrationReport {
  totalSamples: number;
  correctHuman: number;
  correctAI: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  humanAccuracy: number;
  aiAccuracy: number;
  signalEffectiveness: SignalStats[];
  recommendations: string[];
  threshold: number;
  suggestedThreshold: number;
  details: SampleDetail[];
}

export interface SampleDetail {
  id: string;
  expectedVerdict: "human" | "ai";
  actualVerdict: string;
  score: number;
  correct: boolean;
  signals: string[];
}

const CURRENT_THRESHOLD = 0.35;

export async function runCalibration(): Promise<CalibrationReport> {
  const allSamples: CorpusSample[] = [...HUMAN_SAMPLES, ...AI_SAMPLES];
  const details: SampleDetail[] = [];
  const signalMap = new Map<string, { triggered: number; correctWhenTriggered: number; falsePositiveOnHuman: number }>();

  let correctHuman = 0;
  let correctAI = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  // Track scores for threshold optimization
  const humanScores: number[] = [];
  const aiScores: number[] = [];

  for (const sample of allSamples) {
    const result: AIDetectionResult = await detectAI(sample.content);
    const signalTypes = result.signals.map((s: AISignal) => s.type);

    // Determine if classification was correct
    // "human" or "likely_human" → predicted human; "likely_ai" or "ai" → predicted AI
    const predictedHuman = result.passesThreshold;
    const expectedHuman = sample.expectedVerdict === "human";
    const correct = predictedHuman === expectedHuman;

    if (expectedHuman) {
      humanScores.push(result.score);
      if (correct) {
        correctHuman++;
      } else {
        falsePositives++; // human content flagged as AI
      }
    } else {
      aiScores.push(result.score);
      if (correct) {
        correctAI++;
      } else {
        falseNegatives++; // AI content passed as human
      }
    }

    // Track signal effectiveness
    for (const signalType of signalTypes) {
      const stats = signalMap.get(signalType) ?? { triggered: 0, correctWhenTriggered: 0, falsePositiveOnHuman: 0 };
      stats.triggered++;
      if (!expectedHuman) {
        // Signal triggered on AI content — that's correct behavior
        stats.correctWhenTriggered++;
      } else {
        // Signal triggered on human content — false alarm
        stats.falsePositiveOnHuman++;
      }
      signalMap.set(signalType, stats);
    }

    details.push({
      id: sample.id,
      expectedVerdict: sample.expectedVerdict,
      actualVerdict: result.verdict,
      score: result.score,
      correct,
      signals: signalTypes,
    });
  }

  // Compute signal effectiveness
  const signalEffectiveness: SignalStats[] = Array.from(signalMap.entries())
    .map(([signalType, stats]) => ({
      signalType,
      triggeredCount: stats.triggered,
      correctWhenTriggered: stats.correctWhenTriggered,
      effectiveness: stats.triggered > 0 ? stats.correctWhenTriggered / stats.triggered : 0,
      falsePositiveCount: stats.falsePositiveOnHuman,
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness);

  // Suggest threshold: find the value that maximizes separation
  const suggestedThreshold = findOptimalThreshold(humanScores, aiScores);

  // Generate recommendations
  const recommendations = generateRecommendations(signalEffectiveness, falsePositives, falseNegatives, humanScores, aiScores, suggestedThreshold);

  const totalSamples = allSamples.length;
  const totalCorrect = correctHuman + correctAI;

  return {
    totalSamples,
    correctHuman,
    correctAI,
    falsePositives,
    falseNegatives,
    accuracy: totalCorrect / totalSamples,
    humanAccuracy: correctHuman / HUMAN_SAMPLES.length,
    aiAccuracy: correctAI / AI_SAMPLES.length,
    signalEffectiveness,
    recommendations,
    threshold: CURRENT_THRESHOLD,
    suggestedThreshold,
    details,
  };
}

function findOptimalThreshold(humanScores: number[], aiScores: number[]): number {
  // Test thresholds from 0.15 to 0.60 in 0.01 increments
  // Find the one that maximizes overall accuracy
  let bestThreshold = CURRENT_THRESHOLD;
  let bestAccuracy = 0;

  for (let t = 0.15; t <= 0.60; t += 0.01) {
    const humanCorrect = humanScores.filter((s) => s < t).length;
    const aiCorrect = aiScores.filter((s) => s >= t).length;
    const accuracy = (humanCorrect + aiCorrect) / (humanScores.length + aiScores.length);

    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      bestThreshold = Math.round(t * 100) / 100;
    }
  }

  return bestThreshold;
}

function generateRecommendations(
  signalStats: SignalStats[],
  falsePositives: number,
  falseNegatives: number,
  humanScores: number[],
  aiScores: number[],
  suggestedThreshold: number
): string[] {
  const recs: string[] = [];

  // Threshold recommendation
  if (suggestedThreshold !== CURRENT_THRESHOLD) {
    recs.push(
      `Adjust threshold from ${CURRENT_THRESHOLD} to ${suggestedThreshold} — this maximizes accuracy across the calibration corpus.`
    );
  }

  // False positive issues
  if (falsePositives > 0) {
    const fpSignals = signalStats
      .filter((s) => s.falsePositiveCount > 0)
      .sort((a, b) => b.falsePositiveCount - a.falsePositiveCount);

    if (fpSignals.length > 0) {
      recs.push(
        `Reduce weight for signals that false-alarm on human content: ${fpSignals.map((s) => `${s.signalType} (${s.falsePositiveCount} false positives)`).join(", ")}.`
      );
    }
  }

  // False negative issues
  if (falseNegatives > 0) {
    recs.push(
      `${falseNegatives} AI sample(s) passed as human. Consider increasing weights for high-effectiveness signals or lowering the threshold.`
    );
  }

  // Low-effectiveness signals
  const ineffective = signalStats.filter((s) => s.effectiveness < 0.5 && s.triggeredCount >= 2);
  if (ineffective.length > 0) {
    recs.push(
      `Low-effectiveness signals (below 50% correct when triggered): ${ineffective.map((s) => `${s.signalType} (${Math.round(s.effectiveness * 100)}%)`).join(", ")}. Consider reducing their weights.`
    );
  }

  // Perfect signals
  const perfect = signalStats.filter((s) => s.effectiveness === 1 && s.triggeredCount >= 3);
  if (perfect.length > 0) {
    recs.push(
      `High-accuracy signals (100% correct when triggered): ${perfect.map((s) => `${s.signalType} (${s.triggeredCount} triggers)`).join(", ")}. Consider increasing their weights.`
    );
  }

  // Score distribution insight
  const avgHuman = humanScores.reduce((a, b) => a + b, 0) / humanScores.length;
  const avgAI = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
  recs.push(
    `Score distribution — human avg: ${avgHuman.toFixed(3)}, AI avg: ${avgAI.toFixed(3)}, gap: ${(avgAI - avgHuman).toFixed(3)}.`
  );

  return recs;
}
