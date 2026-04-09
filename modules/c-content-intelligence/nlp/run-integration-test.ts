import { runNLPIntegrationTest } from "./integration-test.js";

async function main() {
  if (!process.env.GOOGLE_NLP_API_KEY) {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│  GOOGLE_NLP_API_KEY is not set                              │
│                                                             │
│  The test will still run in degraded mode (pattern-only     │
│  scoring), but NLP scores will show as "n/a".               │
│                                                             │
│  To set up the API key:                                     │
│  1. Follow docs/google-nlp-setup.md                         │
│  2. Set the env var:                                        │
│     export GOOGLE_NLP_API_KEY="your-key"                    │
│  3. Or via Doppler:                                         │
│     doppler secrets set GOOGLE_NLP_API_KEY="your-key" \\     │
│       --project vmdi --config dev_vmdi                      │
└─────────────────────────────────────────────────────────────┘
`);
  }

  try {
    await runNLPIntegrationTest();
  } catch (err) {
    console.error(
      "Integration test crashed:",
      err instanceof Error ? err.message : String(err)
    );
    process.exitCode = 1;
  }
}

main();
