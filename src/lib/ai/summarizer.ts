import { openai as openaiClient } from './openai';
import { COUNTRY_COMPARISON_PROMPT } from './prompts/country-comparison';
import { PATTERN_ANALYSIS_PROMPT } from './prompts/pattern-analysis';

interface ArticleSummaryInput {
  title: string;
  summary: string;
  country: string;
  sentiment: number;
}

export interface ComparisonResult {
  comparison_text: string;
  key_differences: {
    country: string;
    perspective: string;
    sentiment: string;
  }[];
}

export async function compareCountries(
  topic: string,
  articles: ArticleSummaryInput[],
): Promise<ComparisonResult> {
  const articlesText = articles
    .map((a) => `[${a.country}] ${a.title}\nStimmung: ${a.sentiment.toFixed(2)}\n${a.summary}`)
    .join('\n\n---\n\n');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.2,
    messages: [
      { role: 'system', content: COUNTRY_COMPARISON_PROMPT },
      { role: 'user', content: `Thema: ${topic}\n\nArtikel:\n\n${articlesText}` },
    ],
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('Empty comparison response');
  return JSON.parse(raw) as ComparisonResult;
}

export interface PatternResult {
  similarity_score: number;
  historical_parallel: string;
  current_situation: string;
  key_similarities: string[];
  key_differences: string[];
  risk_assessment: string;
  recommended_monitoring: string[];
}

export async function analyzePattern(
  currentSituation: string,
  historicalPatterns: { description: string; time_window: string; sentiment_trend: number[] }[],
): Promise<PatternResult> {
  const patternsText = historicalPatterns
    .map((p) => `Zeitraum: ${p.time_window}\nSentiment-Trend: [${p.sentiment_trend.join(', ')}]\n${p.description}`)
    .join('\n\n---\n\n');

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    temperature: 0.3,
    messages: [
      { role: 'system', content: PATTERN_ANALYSIS_PROMPT },
      {
        role: 'user',
        content: `Aktuelle Situation:\n${currentSituation}\n\nHistorische Muster:\n\n${patternsText}`,
      },
    ],
  });

  const raw = response.choices[0].message.content;
  if (!raw) throw new Error('Empty pattern response');
  return JSON.parse(raw) as PatternResult;
}
