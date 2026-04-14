import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { fetchAllActiveSources } from '../src/lib/ingestion/manager';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queue ─────────────────────────────────────────────
export const ingestionQueue = new Queue('ingestion', { connection });

// ─── Worker ────────────────────────────────────────────
const worker = new Worker(
  'ingestion',
  async (job) => {
    console.log(`[Ingestion] Job ${job.id} gestartet`);

    const results = await fetchAllActiveSources();
    const totalNew = results.reduce((sum, r) => sum + r.newArticles.length, 0);

    console.log(`[Ingestion] ${totalNew} neue Artikel aus ${results.length} Quellen`);

    // Neue Artikel zur Analyse-Queue übergeben
    const { analysisQueue } = await import('./analysis');
    for (const result of results) {
      for (const articleId of result.newArticles) {
        await analysisQueue.add('analyze', { articleId }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }
    }

    return { totalNew, sources: results.length };
  },
  {
    connection,
    concurrency: 1,
    limiter: { max: 1, duration: 10000 },
  },
);

worker.on('completed', (job) => {
  console.log(`[Ingestion] Job ${job?.id} abgeschlossen`);
});

worker.on('failed', (job, err) => {
  console.error(`[Ingestion] Job ${job?.id} fehlgeschlagen:`, err.message);
});

// ─── Cron: alle 30 Minuten ─────────────────────────────
async function setupCron() {
  await ingestionQueue.upsertJobScheduler(
    'scheduled-ingestion',
    { pattern: '*/30 * * * *' },
    { name: 'fetch-all', data: {} },
  );
  console.log('[Ingestion] Cron-Job eingerichtet: alle 30 Minuten');
}

setupCron().catch(console.error);

console.log('[Ingestion Worker] Gestartet');
