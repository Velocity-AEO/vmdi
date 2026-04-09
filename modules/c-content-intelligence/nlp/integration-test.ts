import { analyzeWithGoogleNLP, type GoogleNLPResult } from "./google-nlp-analyzer.js";
import { computeCompositeScore, type CompositeScore } from "./composite-scorer.js";

interface SampleResult {
  name: string;
  nlpResult: GoogleNLPResult | null;
  composite: CompositeScore;
}

const SAMPLES: { name: string; text: string }[] = [
  {
    name: "Clearly Human",
    text: `Last Tuesday, Sarah Chen from our Portland office closed the Meridian Health deal — $2.4M ARR,
their biggest win this quarter. I watched her pitch deck three times trying to figure out what made it
click. Turns out it wasn't the ROI projections or the competitor teardown. It was the slide where she
showed their CEO a screenshot of his own company's broken search results and said, "This is what your
customers see right now." He signed the contract that afternoon. We took the whole team to Tasty n Sons
to celebrate. Mike ordered four plates of those chocolate potato donuts. Worth every calorie.`,
  },
  {
    name: "Clearly AI",
    text: `Content marketing is a strategic approach to creating and distributing valuable content. It is
designed to attract and retain a clearly defined audience. Furthermore, this methodology can significantly
enhance brand visibility. It is worth noting that businesses that invest in content marketing see
measurable improvements. Moreover, the implementation of content strategies can lead to increased
engagement. Organizations should consider developing comprehensive content plans. Additionally, content
marketing has been shown to generate leads effectively. The benefits of content marketing are numerous
and well-documented. Companies can leverage content to establish thought leadership. In conclusion,
content marketing remains an essential component of modern business strategy.`,
  },
  {
    name: "Edge Case (Professional but Human)",
    text: `We migrated our CI pipeline from Jenkins to GitHub Actions in March 2024 — 47 pipelines, zero
downtime. The trick was running both systems in parallel for two weeks. Our SRE lead, James Rodriguez,
wrote a Terraform module that provisioned self-hosted runners on AWS ECS Fargate, which cut our build
times from 18 minutes to 6. The one thing that almost derailed us? Selenium tests. They're flaky enough
on Jenkins, but GitHub Actions' ephemeral runners made it worse. We ended up replacing 80% of them with
Playwright and haven't looked back. Total cost went from $3,200/month to $890. If you're still on
Jenkins and thinking about switching — just do it, but budget a week for the test migration.`,
  },
];

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length);
}

export async function runNLPIntegrationTest(): Promise<void> {
  const results: SampleResult[] = [];
  const errors: string[] = [];

  console.log("\n--- Google NLP Integration Test ---\n");

  const hasKey = !!process.env.GOOGLE_NLP_API_KEY;
  console.log(`GOOGLE_NLP_API_KEY: ${hasKey ? "set" : "NOT SET (will degrade gracefully)"}\n`);

  for (const sample of SAMPLES) {
    try {
      const nlpResult = await analyzeWithGoogleNLP(sample.text);
      const composite = computeCompositeScore(0.3, nlpResult);
      results.push({ name: sample.name, nlpResult, composite });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${sample.name}: ${msg}`);
      console.error(`ERROR processing "${sample.name}": ${msg}`);
    }
  }

  // Print results table
  const header = [
    pad("Sample", 32),
    pad("NLP Score", 12),
    pad("Composite", 12),
    pad("Verdict", 24),
    pad("Entities", 10),
    pad("Sentiment Var", 14),
  ].join(" | ");

  const separator = "-".repeat(header.length);

  console.log(header);
  console.log(separator);

  for (const r of results) {
    const nlpScore = r.composite.nlpScore !== null
      ? r.composite.nlpScore.toFixed(2)
      : "n/a";

    const entityCount = r.nlpResult !== null
      ? String(r.nlpResult.entityCount)
      : "n/a";

    const sentimentVar = r.nlpResult !== null
      ? r.nlpResult.humanSignals.hasEmotionalVariance ? "yes" : "no"
      : "n/a";

    console.log(
      [
        pad(r.name, 32),
        pad(nlpScore, 12),
        pad(r.composite.finalScore.toFixed(2), 12),
        pad(`${r.composite.verdict} (${r.composite.confidence})`, 24),
        pad(entityCount, 10),
        pad(sentimentVar, 14),
      ].join(" | ")
    );
  }

  console.log(separator);

  // Print reasoning for each
  console.log("\n--- Detailed Reasoning ---\n");
  for (const r of results) {
    console.log(`${r.name}:`);
    for (const line of r.composite.reasoning) {
      console.log(`  ${line}`);
    }
    if (r.nlpResult) {
      const types = r.nlpResult.entityTypes;
      if (types.length > 0) {
        console.log(`  Entity types: ${types.join(", ")}`);
      }
      console.log(`  Sentiment: score=${r.nlpResult.sentimentScore.toFixed(2)}, magnitude=${r.nlpResult.sentimentMagnitude.toFixed(2)}`);
    }
    console.log();
  }

  // Verdict
  console.log(separator);
  if (errors.length > 0) {
    console.log(`\nFAIL: ${errors.length} sample(s) threw errors:`);
    for (const e of errors) {
      console.log(`  - ${e}`);
    }
    process.exitCode = 1;
  } else if (results.length === SAMPLES.length) {
    console.log("\nPASS: All 3 samples processed successfully.");
    if (!hasKey) {
      console.log("NOTE: Running in degraded mode (no API key). NLP scores are unavailable.");
      console.log("      Set GOOGLE_NLP_API_KEY to enable full NLP scoring. See docs/google-nlp-setup.md");
    }
  } else {
    console.log(`\nFAIL: Expected ${SAMPLES.length} results, got ${results.length}.`);
    process.exitCode = 1;
  }
}
