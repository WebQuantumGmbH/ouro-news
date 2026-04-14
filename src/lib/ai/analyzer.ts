import { openai } from './openai';

export interface ArticleAnalysisResult {
  sentiment: {
    score: number;
    label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
    emotional_tone: Record<string, number>;
  };
  political: {
    score: number;
    label: 'far_left' | 'left' | 'center_left' | 'center' | 'center_right' | 'right' | 'far_right';
  };
  factuality: {
    score: number;
    label: 'false' | 'likely_false' | 'uncertain' | 'likely_true' | 'verified';
  };
  entities: {
    persons: string[];
    places: string[];
    organizations: string[];
  };
  topics: string[];
  country_relevance: Record<string, number>;
  summary: string;
}

const ANALYSIS_SYSTEM_PROMPT = `Du bist ein erfahrener Nachrichtenanalyst. Du analysierst Nachrichtenartikel mehrdimensional und neutral.
Antworte IMMER als valides JSON-Objekt in folgendem Format:

{
  "sentiment": {
    "score": <float -1.0 bis 1.0>,
    "label": <"very_negative"|"negative"|"neutral"|"positive"|"very_positive">,
    "emotional_tone": {"anger": <0-1>, "fear": <0-1>, "joy": <0-1>, "sadness": <0-1>, "surprise": <0-1>, "disgust": <0-1>}
  },
  "political": {
    "score": <float -1.0 (progressiv/links) bis 1.0 (konservativ/rechts)>,
    "label": <"far_left"|"left"|"center_left"|"center"|"center_right"|"right"|"far_right">
  },
  "factuality": {
    "score": <float 0.0 (falsch) bis 1.0 (verifiziert)>,
    "label": <"false"|"likely_false"|"uncertain"|"likely_true"|"verified">
  },
  "entities": {
    "persons": [<Namen>],
    "places": [<Orte/Länder>],
    "organizations": [<Organisationen>]
  },
  "topics": [<1-5 Themen als kurze Begriffe>],
  "country_relevance": {<ISO-Code>: <0.0-1.0>},
  "summary": "<2-3 Sätze Zusammenfassung>"
}`;

export async function analyzeArticle(
  title: string,
  content: string,
  sourceCountry: string,
): Promise<ArticleAnalysisResult> {
  const truncated = content.length > 8000 ? content.slice(0, 8000) + '…' : content;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Quelle: Land ${sourceCountry}\n\nTitel: ${title}\n\nInhalt:\n${truncated}`,
      },
    ],
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('Empty GPT-4o response');

  return JSON.parse(raw) as ArticleAnalysisResult;
}
