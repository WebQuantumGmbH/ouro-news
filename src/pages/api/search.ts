import type { APIRoute } from 'astro';
import { createEmbedding } from '@lib/ai/openai';
import { searchSimilarArticles } from '@lib/vector/collections';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as { query: string; limit?: number; country?: string };

  if (!body.query || body.query.trim().length < 3) {
    return new Response(JSON.stringify({ error: 'Query zu kurz (min. 3 Zeichen)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const vector = await createEmbedding(body.query);

  const filter: Record<string, unknown> = {};
  if (body.country) {
    filter.must = [
      { key: 'source_country', match: { value: body.country } },
    ];
  }

  const results = await searchSimilarArticles(
    vector,
    body.limit || 10,
    Object.keys(filter).length > 0 ? filter : undefined,
  );

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
