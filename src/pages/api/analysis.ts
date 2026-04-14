import type { APIRoute } from 'astro';
import { getTopicTrends, getCountrySentiment } from '@lib/analysis/trends';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const type = url.searchParams.get('type') || 'topics';
  const days = Number(url.searchParams.get('days')) || 7;

  if (type === 'topics') {
    const trends = await getTopicTrends(days);
    return new Response(JSON.stringify({ trends }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (type === 'country') {
    const country = url.searchParams.get('country');
    if (!country) {
      return new Response(JSON.stringify({ error: 'country parameter required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const sentiment = await getCountrySentiment(country, days);
    return new Response(JSON.stringify({ country, sentiment }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown type' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
