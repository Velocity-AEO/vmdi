import type { CalibrationReport } from "./calibrator.js";
import { HUMAN_SAMPLES } from "./sample-corpus.js";

export type WeightMap = Record<string, number>;

// Current weights by severity tier
const BASE_WEIGHTS: WeightMap = {
  // HIGH (0.15)
  transition_phrase_overuse: 0.15,
  paragraph_uniformity: 0.15,
  low_sentence_variance: 0.15,
  list_over_reliance: 0.15,
  generic_opener: 0.15,
  // MEDIUM (0.10)
  hedging_language: 0.10,
  excessive_passive_voice: 0.10,
  no_first_person: 0.10,
  zero_contractions: 0.10,
  perfect_grammar: 0.10,
  // LOW (0.05)
  keyword_stuffing: 0.05,
  overly_formal_vocabulary: 0.05,
  no_specifics: 0.05,
  em_dash_overuse: 0.05,
  rhetorical_question_overuse: 0.05,
};

const HUMAN_SAMPLE_COUNT = HUMAN_SAMPLES.length;

export function optimizeWeights(report: CalibrationReport): WeightMap {
  const optimized: WeightMap = { ...BASE_WEIGHTS };

  for (const signal of report.signalEffectiveness) {
    const baseWeight = BASE_WEIGHTS[signal.signalType];
    if (baseWeight === undefined) continue;

    let adjustedWeight = baseWeight;

    // Signals that fired on more than 30% of human samples get weight reduced by 40%
    const humanFalsePositiveRate = signal.falsePositiveCount / HUMAN_SAMPLE_COUNT;
    if (humanFalsePositiveRate > 0.30) {
      adjustedWeight *= 0.60;
    }
    // Signals with low effectiveness get weight reduced by 20%
    else if (signal.effectiveness < 0.50 && signal.triggeredCount >= 2) {
      adjustedWeight *= 0.80;
    }
    // Signals that never false-positived on human content get weight increased by 10%
    else if (signal.falsePositiveCount === 0 && signal.triggeredCount >= 1) {
      adjustedWeight *= 1.10;
    }

    optimized[signal.signalType] = Math.round(adjustedWeight * 1000) / 1000;
  }

  return optimized;
}
