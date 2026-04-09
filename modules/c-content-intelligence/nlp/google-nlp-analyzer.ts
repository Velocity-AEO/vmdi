export interface GoogleNLPResult {
  sentimentScore: number;
  sentimentMagnitude: number;
  entityCount: number;
  entityTypes: string[];
  avgEntitySalience: number;
  classificationCategories: { name: string; confidence: number }[];
  sentences: { text: string; sentiment: number }[];
  humanSignals: {
    hasNamedEntities: boolean;
    hasEmotionalVariance: boolean;
    hasSpecificCategories: boolean;
    entityDensity: number;
  };
}

interface GoogleEntity {
  name: string;
  type: string;
  salience: number;
}

interface GoogleSentence {
  text: { content: string };
  sentiment: { score: number; magnitude: number };
}

interface GoogleCategory {
  name: string;
  confidence: number;
}

interface GoogleAnnotateResponse {
  documentSentiment?: { score: number; magnitude: number };
  entities?: GoogleEntity[];
  sentences?: GoogleSentence[];
  categories?: GoogleCategory[];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

const NAMED_ENTITY_TYPES = new Set([
  "PERSON",
  "ORGANIZATION",
  "LOCATION",
  "EVENT",
  "WORK_OF_ART",
  "CONSUMER_GOOD",
  "PHONE_NUMBER",
  "ADDRESS",
  "DATE",
  "NUMBER",
  "PRICE",
]);

export async function analyzeWithGoogleNLP(
  content: string
): Promise<GoogleNLPResult | null> {
  const apiKey = process.env.GOOGLE_NLP_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://language.googleapis.com/v1/documents:annotateText?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: {
            type: "PLAIN_TEXT",
            content,
          },
          features: {
            extractEntities: true,
            extractDocumentSentiment: true,
            classifyText: true,
            extractSyntax: false,
          },
          encodingType: "UTF8",
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Google NLP API error (${response.status}): ${errorBody}`
      );
      return null;
    }

    const data = (await response.json()) as GoogleAnnotateResponse;

    const entities = data.entities ?? [];
    const sentences = data.sentences ?? [];
    const categories = data.categories ?? [];
    const sentiment = data.documentSentiment ?? { score: 0, magnitude: 0 };

    const entityTypes = [
      ...new Set(entities.map((e) => e.type).filter((t) => NAMED_ENTITY_TYPES.has(t))),
    ];

    const namedEntities = entities.filter((e) => NAMED_ENTITY_TYPES.has(e.type));
    const avgEntitySalience =
      namedEntities.length > 0
        ? namedEntities.reduce((sum, e) => sum + e.salience, 0) /
          namedEntities.length
        : 0;

    const sentenceSentiments = sentences.map((s) => ({
      text: s.text.content,
      sentiment: s.sentiment.score,
    }));

    const wordCount = countWords(content);
    const entityDensity =
      wordCount > 0 ? (namedEntities.length / wordCount) * 100 : 0;

    let hasEmotionalVariance = false;
    if (sentenceSentiments.length >= 3) {
      const scores = sentenceSentiments.map((s) => s.sentiment);
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      hasEmotionalVariance = max - min > 0.4;
    }

    return {
      sentimentScore: sentiment.score,
      sentimentMagnitude: sentiment.magnitude,
      entityCount: namedEntities.length,
      entityTypes,
      avgEntitySalience: Math.round(avgEntitySalience * 1000) / 1000,
      classificationCategories: categories.map((c) => ({
        name: c.name,
        confidence: c.confidence,
      })),
      sentences: sentenceSentiments,
      humanSignals: {
        hasNamedEntities: namedEntities.length > 0,
        hasEmotionalVariance,
        hasSpecificCategories: categories.length > 0,
        entityDensity: Math.round(entityDensity * 100) / 100,
      },
    };
  } catch (err) {
    console.error(
      "Google NLP API call failed:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
