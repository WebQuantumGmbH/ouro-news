import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '../src/lib/db/client';
import { articles, articleAnalysis } from '../src/lib/db/schema';
import { analyzeArticle } from '../src/lib/ai/analyzer';
import { generateAndStoreEmbedding } from '../src/lib/ai/embeddings';
import { calculateWdfIdf } from '../src/lib/analysis/wdf-idf';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queue ─────────────────────────────────────────────
export const analysisQueue = new Queue('analysis', { connection });

// ─── Worker ────────────────────────────────────────────
const worker = new Worker(
  'analysis',
  async (job) => {
    const { articleId } = job.data as { articleId: string };
    console.log(`[Analysis] Analysiere Artikel ${articleId}`);

    // Artikel laden
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId));

    if (!article) throw new Error(`Artikel ${articleId} nicht gefunden`);
    if (article.processedAt) {
      console.log(`[Analysis] Artikel ${articleId} bereits verarbeitet, überspringe`);
      return;
    }

    // Quelle laden für country
    const { sources } = await import('../src/lib/db/schema');
    const [source] = await db.select().from(sources).where(eq(sources.id, article.sourceId));
    const country = source?.country || 'XX';

    // 1. GPT-4o Multi-dimensionale Analyse
    const analysis = await analyzeArticle(article.title, article.content, country);

    // 2. In DB speichern
    await db.insert(articleAnalysis).values({
      id: randomUUID(),
      articleId,
      sentimentScore: analysis.sentiment.score,
      sentimentLabel: analysis.sentiment.label,
      politicalLeaning: analysis.political.score,
      politicalLabel: analysis.political.label,
      factualityScore: analysis.factuality.score,
      factualityLabel: analysis.factuality.label,
      emotionalTone: analysis.sentiment.emotional_tone,
      keyEntities: analysis.entities,
      countryRelevance: analysis.country_relevance,
      topics: analysis.topics,
      modelVersion: 'gpt-4o-2024-08-06',
    });

    // 3. Summary in Artikel speichern
    await db
      .update(articles)
      .set({
        summary: analysis.summary,
        processedAt: new Date(),
      })
      .where(eq(articles.id, articleId));

    // 4. Embedding generieren + in Qdrant speichern
    await generateAndStoreEmbedding(articleId, article.title, article.content, {
      published_at: article.publishedAt?.toISOString() || new Date().toISOString(),
      source_country: country,
      topics: analysis.topics,
      sentiment_score: analysis.sentiment.score,
      political_leaning: analysis.political.score,
    });

    // 5. WDF/IDF berechnen
    await calculateWdfIdf(articleId, article.content);

    console.log(`[Analysis] ✓ Artikel ${articleId} vollständig analysiert`);
  },
  {
    connection,
    concurrency: 3,
    limiter: { max: 10, duration: 60000 }, // Max 10 pro Minute (OpenAI Ratenlimit)
  },
);

worker.on('completed', (job) => {
  console.log(`[Analysis] Job ${job?.id} abgeschlossen`);
});

worker.on('failed', (job, err) => {
  console.error(`[Analysis] Job ${job?.id} fehlgeschlagen:`, err.message);
});

console.log('[Analysis Worker] Gestartet');
