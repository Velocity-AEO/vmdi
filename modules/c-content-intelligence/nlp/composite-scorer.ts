import type { GoogleNLPResult } from "./google-nlp-analyzer.js";

export interface CompositeScore {
  finalScore: number;
  patternScore: number;
  nlpScore: number | null;
  nlpAvailable: boolean;
  verdict: "human" | "likely_human" | "likely_ai" | "ai";
  confidence: "low" | "medium" | "high";
  passesThreshold: boolean;
  reasoning: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function classify(score: number): {
  verdict: CompositeScore["verdict"];
} {
  if (score < 0.2) return { verdict: "human" };
  if (score <= 0.35) return { verdict: "likely_human" };
  if (score <= 0.6) return { verdict: "likely_ai" };
  return { verdict: "ai" };
}

function computeNlpScore(nlp: GoogleNLPResult): {
  score: number;
  reasoning: string[];
} {
  let score = 0.5;
  const reasoning: string[] = [];

  if (nlp.humanSignals.hasNamedEntities) {
    score -= 0.15;
    reasoning.push(
      `Named entities found (${nlp.entityCount} entities: ${nlp.entityTypes.join(", ")}) — human signal (-0.15)`
    );
  }

  if (nlp.humanSignals.hasEmotionalVariance) {
    score -= 0.1;
    reasoning.push(
      "Sentence sentiment varies significantly — human signal (-0.10)"
    );
  }

  if (nlp.humanSignals.entityDensity > 0.5) {
    score -= 0.1;
    reasoning.push(
      `Entity density ${nlp.humanSignals.entityDensity.toFixed(2)} per 100 words (>0.5) — human signal (-0.10)`
    );
  }

  if (nlp.humanSignals.hasSpecificCategories) {
    score -= 0.05;
    reasoning.push(
      `Content classifiable into ${nlp.classificationCategories.length} categories — human signal (-0.05)`
    );
  }

  if (nlp.entityCount === 0) {
    score += 0.2;
    reasoning.push(
      "Zero named entities found — AI signal (+0.20)"
    );
  }

  if (nlp.sentimentMagnitude < 0.1) {
    score += 0.15;
    reasoning.push(
      `Sentiment magnitude ${nlp.sentimentMagnitude.toFixed(2)} (<0.1) — flat emotion is an AI signal (+0.15)`
    );
  }

  if (nlp.avgEntitySalience < 0.1 && nlp.entityCount > 0) {
    score += 0.1;
    reasoning.push(
      `Average entity salience ${nlp.avgEntitySalience.toFixed(3)} (<0.1) — entities lack prominence, AI signal (+0.10)`
    );
  }

  return {
    score: clamp(score, 0, 1),
    reasoning,
  };
}

export function computeCompositeScore(
  patternScore: number,
  nlpResult: GoogleNLPResult | null
): CompositeScore {
  const reasoning: string[] = [];

  reasoning.push(
    `Pattern analysis score: ${patternScore.toFixed(2)}`
  );

  if (!nlpResult) {
    const { verdict } = classify(patternScore);
    reasoning.push(
      "Google NLP unavailable — using pattern score only"
    );

    return {
      finalScore: patternScore,
      patternScore,
      nlpScore: null,
      nlpAvailable: false,
      verdict,
      confidence: patternScore < 0.2 || patternScore > 0.6 ? "high" : "medium",
      passesThreshold: patternScore < 0.35,
      reasoning,
    };
  }

  const nlpAnalysis = computeNlpScore(nlpResult);
  const nlpScore = Math.round(nlpAnalysis.score * 100) / 100;

  reasoning.push(`NLP analysis score: ${nlpScore.toFixed(2)}`);
  reasoning.push(...nlpAnalysis.reasoning);

  const finalScore =
    Math.round((patternScore * 0.65 + nlpScore * 0.35) * 100) / 100;

  reasoning.push(
    `Composite: (${patternScore.toFixed(2)} × 0.65) + (${nlpScore.toFixed(2)} × 0.35) = ${finalScore.toFixed(2)}`
  );

  const bothAgree =
    (patternScore < 0.35 && nlpScore < 0.35) ||
    (patternScore > 0.35 && nlpScore > 0.35);

  const confidence: CompositeScore["confidence"] = bothAgree
    ? "high"
    : "medium";

  if (bothAgree) {
    reasoning.push(
      "Both pattern and NLP scores agree — high confidence"
    );
  } else {
    reasoning.push(
      `Pattern (${patternScore.toFixed(2)}) and NLP (${nlpScore.toFixed(2)}) disagree — medium confidence`
    );
  }

  const { verdict } = classify(finalScore);

  return {
    finalScore,
    patternScore,
    nlpScore,
    nlpAvailable: true,
    verdict,
    confidence,
    passesThreshold: finalScore < 0.35,
    reasoning,
  };
}
