import { db } from '../db/client';
import { articleAnalysis, articles, articleTopics, topics } from '../db/schema';
import { eq, sql, desc, and, gte } from 'drizzle-orm';

export interface TrendData {
  topic: string;
  sentimentAvg: number;
  articleCount: number;
  direction: 'rising' | 'stable' | 'falling';
}

export async function getTopicTrends(days = 7): Promise<TrendData[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await db
    .select({
      topicName: topics.name,
      articleCount: topics.articleCount,
      direction: topics.trendDirection,
    })
    .from(topics)
    .orderBy(desc(topics.articleCount))
    .limit(20);

  // Enrich mit durchschnittlichem Sentiment
  const trends: TrendData[] = [];
  for (const row of result) {
    const [sentimentRow] = await db
      .select({ avg: sql<number>`AVG(${articleAnalysis.sentimentScore})` })
      .from(articleAnalysis)
      .innerJoin(articles, eq(articles.id, articleAnalysis.articleId))
      .innerJoin(articleTopics, eq(articleTopics.articleId, articles.id))
      .innerJoin(topics, eq(topics.id, articleTopics.topicId))
      .where(and(eq(topics.name, row.topicName), gte(articles.publishedAt, since)));

    trends.push({
      topic: row.topicName,
      sentimentAvg: sentimentRow?.avg || 0,
      articleCount: row.articleCount,
      direction: row.direction,
    });
  }

  return trends;
}

export async function getCountrySentiment(
  country: string,
  days = 30,
): Promise<{ date: string; sentiment: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      date: sql<string>`DATE(${articles.publishedAt})`,
      sentiment: sql<number>`AVG(${articleAnalysis.sentimentScore})`,
    })
    .from(articleAnalysis)
    .innerJoin(articles, eq(articles.id, articleAnalysis.articleId))
    .where(
      and(
        gte(articles.publishedAt, since),
        sql`JSON_EXTRACT(${articleAnalysis.countryRelevance}, ${`$.${country}`}) > 0.3`,
      ),
    )
    .groupBy(sql`DATE(${articles.publishedAt})`)
    .orderBy(sql`DATE(${articles.publishedAt})`);

  return rows.map((r) => ({ date: r.date, sentiment: r.sentiment }));
}
