import { runContentPipeline } from "./content-pipeline.js";
import { detectAI } from "./ai-detector.js";

const SAMPLE_ARTICLE = `# Why Technical SEO Matters for Service Businesses

Most service businesses pour money into Google Ads and social media without touching their website's technical foundation. That's a mistake we see constantly at Velocity AEO — and it's costing them leads they don't even know about.

## The Problem Nobody Talks About

Here's what happens: a plumbing company in Denver spends $3,000/month on ads. Their website loads in 6.2 seconds on mobile. Google's own data shows 53% of mobile users abandon sites that take longer than 3 seconds to load. That plumber is burning through half their ad budget before anyone even sees the homepage.

Technical SEO for service businesses isn't optional. It's the infrastructure that makes every other marketing dollar work harder. We ran an SEO audit on 47 service business websites last quarter. The average page speed score was 34 out of 100. Only 6 had proper schema markup. Zero had optimized Core Web Vitals.

## What Actually Moves the Needle

Local SEO depends on technical foundations more than most business owners realize. Your Google Business Profile can be perfect, but if your site serves a 4MB hero image and doesn't have mobile-responsive navigation, you're handing rankings to competitors who bothered to fix theirs.

The three things we fix first on every client site:

Page speed optimization — compress images, defer non-critical JavaScript, enable browser caching. We typically cut load times by 60% in the first week.

Schema markup — LocalBusiness, Service, and FAQ schema tell Google exactly what you do and where. This directly impacts how you appear in local pack results.

Crawl efficiency — service businesses love one-page designs with everything jammed together. Google can't parse that well. We restructure into clean, crawlable hierarchies with dedicated service pages.

## The ROI Is Real

One of our HVAC clients in Austin went from page 4 to the local 3-pack in 11 weeks after we fixed their technical issues. No new content. No link building. Just fixing what was broken under the hood. Their organic leads went from 8 to 31 per month.

Technical SEO isn't glamorous. You can't screenshot it for Instagram. But it's the difference between a website that works for you and one that works against you. Every service business should start here before spending another dollar on content or advertising.`;

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("Skipping e2e test — ANTHROPIC_API_KEY not set");
    process.exit(0);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  VMDI Content Pipeline — End-to-End Test");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  // Pre-pipeline AI detection score
  console.log("Step 1: Analyzing raw content AI detection score...");
  const preDetection = await detectAI(SAMPLE_ARTICLE);
  console.log(`  Raw AI detection score: ${preDetection.score}`);
  console.log(`  Raw verdict: ${preDetection.verdict} (${preDetection.confidence})`);
  console.log(`  Raw signals: ${preDetection.signals.length} triggered`);
  console.log("");

  // Run full pipeline
  console.log("Step 2: Running full content pipeline...");
  console.log("  (humanize → AI detect → rewrite if needed → keyword enforce → uniqueness → schema)");
  console.log("");

  const startTime = Date.now();

  const result = await runContentPipeline({
    rawContent: SAMPLE_ARTICLE,
    primaryKeyword: "technical SEO for service businesses",
    secondaryKeywords: ["SEO audit", "local SEO", "page speed"],
    tone: "professional",
    author: { name: "Vincent Goodrich" },
    existingAssets: [],
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Results
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Result:             ${result.success ? "SUCCESS" : "FAILED"}`);
  console.log(`  Elapsed:            ${elapsed}s`);
  console.log("");
  console.log(`  AI Detection:`);
  console.log(`    Before pipeline:  ${preDetection.score} (${preDetection.verdict})`);
  console.log(`    After pipeline:   ${result.aiDetectionScore}`);
  console.log(`    Signals after:    ${result.aiDetectionSignals.length} triggered`);
  console.log("");
  console.log(`  Uniqueness score:   ${result.uniquenessScore}`);
  console.log("");

  const wordCount = result.content.split(/\s+/).filter((w) => w.length > 0).length;
  console.log(`  Final word count:   ${wordCount}`);
  console.log(`  Schema generated:   ${result.schema ? "yes" : "no"}`);

  if (result.schema) {
    console.log(`  Schema headline:    ${result.schema.headline}`);
    console.log(`  Schema publisher:   ${result.schema.publisher.name}`);
  }

  if (result.issues.length > 0) {
    console.log("");
    console.log("  Issues:");
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!result.success) {
    console.error("\nE2E test FAILED — pipeline did not produce successful result");
    process.exit(1);
  }

  console.log("\nE2E test PASSED");
}

main().catch((err) => {
  console.error("E2E test crashed:", err);
  process.exit(1);
});
