# Content Intelligence Engine

The content intelligence engine at `modules/c-content-intelligence/` is VMDI's core moat. Every piece of content published through the platform runs through this pipeline to ensure it is unique, humanized, keyword-optimized, and not detectable as AI-generated.

## What the Pipeline Does (End to End)

```
Raw Content
  │
  ▼
1. HUMANIZE (humanizer.ts)
   Claude rewrites the content to eliminate AI patterns:
   removes "furthermore"/"delve"/etc, varies sentence length,
   adds contractions and first-person voice, matches the
   specified tone (professional/conversational/educational).
  │
  ▼
2. AI DETECTION (ai-detector.ts)
   15 weighted pattern checks score the content 0–1:
   - HIGH weight (0.15): transition phrases, paragraph uniformity,
     sentence length variance, list over-reliance, generic openers
   - MEDIUM weight (0.10): hedging language, passive voice,
     no first person, zero contractions, perfect grammar
   - LOW weight (0.05): keyword stuffing, formal vocabulary,
     no specifics, em dash overuse, rhetorical questions
   If GOOGLE_NLP_API_KEY is set, Google NLP cross-validates
   with entity/sentiment/classification analysis (35% weight).
  │
  ▼
3. REWRITE IF NEEDED (ai-rewriter.ts)
   If the AI detection score exceeds 0.35, the engine sends
   the specific signals back to Claude with targeted rewriting
   instructions. Up to 3 attempts. If it still fails, the
   content is rejected.
  │
  ▼
4. KEYWORD ENFORCEMENT (keyword-enforcer.ts)
   Checks that the primary keyword appears in:
   - Title / H1
   - First paragraph
   - URL slug (derived from title)
   Checks that all secondary keywords appear at least once.
   If issues found, Claude auto-fixes with minimal edits.
   Up to 2 attempts before rejection.
  │
  ▼
5. UNIQUENESS CHECK (uniqueness-checker.ts)
   TF-IDF vectors with cosine similarity against all existing
   assets. Score below 0.75 = rejected as duplicate.
   No external ML libraries — implemented from scratch.
  │
  ▼
6. SCHEMA GENERATION (schema-generator.ts)
   Produces valid JSON-LD (BlogPosting) with headline, author,
   publisher (Velocity AEO), date, keywords, and URL.
  │
  ▼
Pipeline Result
  { success, content, schema, uniquenessScore,
    aiDetectionScore, aiDetectionSignals, issues }
```

## Environment Variables

| Variable | Required | Used By |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | humanizer, keyword-enforcer, ai-rewriter, content-pipeline |
| `GOOGLE_NLP_API_KEY` | No | nlp/google-nlp-analyzer (degrades gracefully without it) |

## How to Run

### Full Pipeline

```typescript
import { runContentPipeline } from "@vmdi/content-intelligence";

const result = await runContentPipeline({
  rawContent: "Your article text...",
  primaryKeyword: "content marketing",
  secondaryKeywords: ["B2B", "organic traffic"],
  tone: "professional",
  author: { name: "Jane Doe" },
  existingAssets: ["existing article body 1", "existing article body 2"],
});
```

### Calibration

Runs the AI detector against a corpus of known human and AI-generated samples to verify signal accuracy:

```bash
cd modules/c-content-intelligence
npm run calibrate
```

This outputs per-signal accuracy, false positive/negative rates, and recommended weight adjustments.

### NLP Integration Test

Tests the Google NLP secondary scoring layer with 3 sample texts (clearly human, clearly AI, edge case):

```bash
cd modules/c-content-intelligence
npm run test:nlp
```

See `docs/google-nlp-setup.md` for API key setup instructions.

## Score Interpretation Guide

The AI detection score ranges from 0.0 to 1.0. Here is what each range means in practice:

### 0.00 – 0.10: Confidently Human
No AI signals detected. Content has varied sentence structure, named entities, first-person voice, specific data, and natural contractions. This is what handwritten content by an experienced writer looks like.

**Action**: Publish. No review needed.

### 0.10 – 0.20: Human
One or two minor signals triggered (e.g., slightly low sentence variance or no em dashes). These are noise — human writers produce content in this range regularly.

**Action**: Publish. No review needed.

### 0.20 – 0.35: Likely Human (Threshold)
A few signals triggered but nothing dominant. This is the boundary. Content may have been AI-assisted but was edited well enough that it reads as human. The 0.35 threshold is where the pipeline auto-passes.

**Action**: Auto-passes the pipeline. If it lands here after rewriting, the engine accepts it.

### 0.35 – 0.50: Borderline
Multiple medium-weight signals firing. Content has some AI patterns — maybe too many transition phrases, uniform paragraph lengths, or no first-person pronouns. Could be a careful human writer or a lightly edited AI draft.

**Action**: The pipeline attempts automatic rewriting. If the score drops below 0.35 within 3 attempts, it passes. If not, it is rejected for manual review. Staff should rewrite flagged sections and re-run.

### 0.50 – 0.70: Likely AI
Strong pattern signals across multiple categories. Paragraph uniformity, hedging language, passive voice, and no specifics all firing together. This content was almost certainly AI-generated with minimal editing.

**Action**: Rejected by the pipeline. Requires significant manual rewriting before it can be re-submitted. Do not attempt to "tweak past" the detector — restructure the content.

### 0.70 – 1.00: AI
Nearly every signal category is triggering. Generic opener, transition phrase overuse, perfect grammar, zero contractions, no named entities. This is raw AI output or a very light copy-paste from ChatGPT.

**Action**: Rejected. Should be rewritten from scratch with original research, specific examples, and a clear authorial voice. Re-running through the humanizer alone will not be enough at this score.

## When to Manually Review vs Auto-Reject

| Score Range | Pipeline Decision | What to Do |
|---|---|---|
| 0.00 – 0.35 | Auto-pass | Publish normally |
| 0.35 – 0.50 | Auto-rewrite (3 attempts) | If rewrite succeeds: publish. If not: manual review |
| 0.50 – 0.75 | Rejected | Manual rewrite required. Focus on the specific signals listed in the rejection |
| 0.75 – 1.00 | Rejected | Rewrite from scratch. The content structure itself is AI-typical |
| Uniqueness < 0.75 | Rejected | Content too similar to existing asset. Differentiate with original data/angles |
| Keyword fail (2x) | Rejected | Claude couldn't naturally insert keywords. Restructure the article around the keyword |

## Architecture Notes

- All pattern checks are deterministic and run locally (no API calls). The NLP layer is the only external dependency.
- The composite score weights pattern analysis at 65% and NLP at 35% when both are available.
- When NLP is unavailable, the pattern score is used directly but confidence is capped at "medium" for borderline cases (0.20–0.60).
- The rewriter receives the exact signals that triggered and generates targeted fix instructions — it does not blindly rewrite the whole article.
- Uniqueness checking uses TF-IDF with cosine similarity, implemented from scratch with no external ML libraries.
