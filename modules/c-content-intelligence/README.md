# @vmdi/content-intelligence

VAEO's content intelligence engine. Ensures every piece of published content is unique, humanized, keyword-optimized, and properly structured for SEO.

## Functions

### `humanizeContent(rawText, tone)`

Rewrites content through Claude to eliminate AI-detectable patterns. Varies sentence length, removes telltale phrases ("delve", "furthermore", "it's worth noting"), and adjusts voice to the specified tone (`professional`, `conversational`, or `educational`). Preserves all factual claims.

### `checkUniqueness(content, existingAssets)`

Compares content against existing assets using TF-IDF cosine similarity (no external ML dependencies). Returns a uniqueness score (0–1), a duplicate flag (true if score < 0.75), and a list of similar asset titles.

### `enforceKeywords(content, primaryKeyword, secondaryKeywords)`

Validates that the primary keyword appears in the title, H1, first paragraph, and URL slug. Checks that all secondary keywords appear at least once. If issues are found, calls Claude to insert missing keywords naturally. Returns the fixed content and a list of changes made.

### `generateArticleSchema(asset)`

Produces valid JSON-LD (`BlogPosting`) for the given article metadata. Includes headline, author (Person), publisher (Organization: Velocity AEO), datePublished, keywords, and URL.

### `runContentPipeline(input)`

Orchestrates the full pipeline: humanize → enforce keywords → check uniqueness → generate schema. Rejects content that fails uniqueness (score < 0.75) or keyword enforcement after 2 attempts. Returns the final content, schema, uniqueness score, and any issues.

## Environment

Requires `ANTHROPIC_API_KEY` in the environment.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```
