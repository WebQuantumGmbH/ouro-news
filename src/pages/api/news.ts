import type { APIRoute } from 'astro';
import { db } from '@lib/db/client';
import { articles, articleAnalysis, sources } from '@lib/db/schema';
import { eq, desc, and, gte, lte, like, sql } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = (page - 1) * limit;

  const country = url.searchParams.get('country');
  const topic = url.searchParams.get('topic');
  const sentiment = url.searchParams.get('sentiment');
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const q = url.searchParams.get('q');

  const conditions = [];
  if (country) {
    conditions.push(sql`JSON_EXTRACT(${articleAnalysis.countryRelevance}, ${`$.${country}`}) > 0.3`);
  }
  if (topic) {
    conditions.push(sql`JSON_CONTAINS(${articleAnalysis.topics}, ${JSON.stringify(topic)})`);
  }
  if (sentiment) {
    conditions.push(eq(articleAnalysis.sentimentLabel, sentiment as 'positive' | 'negative' | 'neutral' | 'very_positive' | 'very_negative'));
  }
  if (since) conditions.push(gte(articles.publishedAt, new Date(since)));
  if (until) conditions.push(lte(articles.publishedAt, new Date(until)));
  if (q) conditions.push(like(articles.title, `%${q}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      slug: articles.slug,
      imageUrl: articles.imageUrl,
      publishedAt: articles.publishedAt,
      sourceName: sources.name,
      sourceCountry: sources.country,
      sentimentScore: articleAnalysis.sentimentScore,
      sentimentLabel: articleAnalysis.sentimentLabel,
      politicalLeaning: articleAnalysis.politicalLeaning,
      politicalLabel: articleAnalysis.politicalLabel,
      factualityScore: articleAnalysis.factualityScore,
      topics: articleAnalysis.topics,
    })
    .from(articles)
    .leftJoin(articleAnalysis, eq(articleAnalysis.articleId, articles.id))
    .leftJoin(sources, eq(sources.id, articles.sourceId))
    .where(where)
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .leftJoin(articleAnalysis, eq(articleAnalysis.articleId, articles.id))
    .where(where);

  return new Response(JSON.stringify({
    data: rows,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
