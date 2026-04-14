import type { APIRoute } from 'astro';
import { createEmbedding } from '@lib/ai/openai';
import { searchPatterns } from '@lib/vector/collections';
import { analyzePattern } from '@lib/ai/summarizer';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as { situation: string; limit?: number };

  if (!body.situation || body.situation.trim().length < 10) {
    return new Response(JSON.stringify({ error: 'Beschreibung zu kurz (min. 10 Zeichen)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Aktuelle Situation → Embedding → ähnliche Muster suchen
  const vector = await createEmbedding(body.situation);
  const similar = await searchPatterns(vector, body.limit || 5);

  if (similar.length === 0) {
    return new Response(JSON.stringify({
      message: 'Noch keine historischen Muster vorhanden. Mehr Daten erforderlich.',
      patterns: [],
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const historicalPatterns = similar.map((s: unknown) => {
    const point = s as { payload: Record<string, unknown> };
    return {
      description: String(point.payload.description || ''),
      time_window: String(point.payload.time_window || ''),
      sentiment_trend: (point.payload.sentiment_trend || []) as number[],
    };
  });

  const analysis = await analyzePattern(body.situation, historicalPatterns);

  return new Response(JSON.stringify({ analysis, historicalPatterns: similar }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
