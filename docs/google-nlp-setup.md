# Google Cloud NLP API Setup

The content intelligence engine uses Google Cloud Natural Language API as a secondary scoring layer for AI detection. It analyzes entity density, sentiment variance, and content classification to cross-validate the pattern-based detector.

This is optional — the pipeline degrades gracefully without it — but it raises detection confidence from "medium" to "high" when both scores agree.

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name: `vmdi-content-intelligence`
4. Click **Create**
5. Wait for the project to be created, then select it from the dropdown

## Step 2: Enable the Cloud Natural Language API

1. In the left sidebar: **APIs & Services** → **Library**
2. Search for **Cloud Natural Language API**
3. Click on it → **Enable**
4. Wait for the API to be enabled (takes a few seconds)

## Step 3: Create an API Key

1. In the left sidebar: **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. A key will be generated immediately — copy it
4. Click **Edit API key** (the pencil icon) to restrict it:
   - Under **API restrictions**, select **Restrict key**
   - Check only: **Cloud Natural Language API**
   - Click **Save**

## Step 4: Add the Key to Doppler

```bash
doppler secrets set GOOGLE_NLP_API_KEY="your-key-here" --project vmdi --config dev_vmdi
```

Or for local development, add to your `.env`:

```
GOOGLE_NLP_API_KEY=your-key-here
```

## Step 5: Verify

Run the integration test:

```bash
cd modules/c-content-intelligence
npm run test:nlp
```

You should see a table with NLP scores for 3 sample texts and a PASS result.

## Cost Estimate

Google Cloud NLP charges per "unit" (1 unit = 1,000 characters).

| Volume | Estimated Monthly Cost |
|---|---|
| 50 articles/month (~1,500 words each) | ~$0.05 |
| 200 articles/month | ~$0.20 |
| 1,000 articles/month | ~$1.00 |

The free tier includes 5,000 units/month. At typical article lengths, that covers roughly 500 articles before any charges apply. Essentially free for VMDI's current scale.

## Troubleshooting

**403 Forbidden**: The API key is restricted to a different API or the Cloud Natural Language API is not enabled on the project.

**400 Bad Request**: Content is empty or exceeds the 1MB limit. The analyzer handles this gracefully by returning `null`.

**No GOOGLE_NLP_API_KEY set**: The pipeline runs without NLP scoring. Pattern-based detection still works, but confidence is capped at "medium" for borderline cases.
