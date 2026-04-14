import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { sources, articles } from '../db/schema';
import type { ISourceAdapter, SourceConfig, NormalizedArticle } from './adapters/base';
import { RssAdapter } from './adapters/rss';
import { NewsApiAdapter } from './adapters/newsapi';
import { ApifyScraperAdapter } from './adapters/scraper';
import { SocialAdapter } from './adapters/social';
import { isDuplicateByUrl } from './deduplication';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

const adapters: Record<string, ISourceAdapter> = {
  rss: new RssAdapter(),
  api: new NewsApiAdapter(),
  scraper: new ApifyScraperAdapter(),
  social: new SocialAdapter(),
};

export async function fetchSource(sourceConfig: SourceConfig): Promise<string[]> {
  const adapter = adapters[sourceConfig.type];
  if (!adapter) throw new Error(`No adapter for type: ${sourceConfig.type}`);

  const raw = await adapter.fetch(sourceConfig);
  const newArticleIds: string[] = [];

  for (const article of raw) {
    if (isDuplicateByUrl(article.url)) continue;

    const id = randomUUID();
    const slug = `${slugify(article.title)}-${id.slice(0, 8)}`;

    try {
      await db.insert(articles).values({
        id,
        sourceId: sourceConfig.id,
        externalId: article.externalId,
        title: article.title,
        content: article.content,
        url: article.url,
        slug,
        imageUrl: article.imageUrl,
        language: article.language,
        publishedAt: article.publishedAt,
      });
      newArticleIds.push(id);
    } catch (err: unknown) {
      // Duplikat (unique constraint) → überspringen
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Duplicate entry')) continue;
      throw err;
    }
  }

  // last_fetched_at aktualisieren
  await db
    .update(sources)
    .set({ lastFetchedAt: new Date() })
    .where(eq(sources.id, sourceConfig.id));

  return newArticleIds;
}

export async function fetchAllActiveSources(): Promise<{ sourceId: string; newArticles: string[] }[]> {
  const allSources = await db.select().from(sources).where(eq(sources.isActive, true));
  const results: { sourceId: string; newArticles: string[] }[] = [];

  for (const src of allSources) {
    try {
      const config: SourceConfig = {
        id: src.id,
        name: src.name,
        type: src.type,
        url: typeof src.url === 'string' ? src.url : '',
        config: (src.config || {}) as Record<string, unknown>,
        language: src.language,
        country: src.country,
      };
      const ids = await fetchSource(config);
      results.push({ sourceId: src.id, newArticles: ids });
      console.log(`✓ ${src.name}: ${ids.length} neue Artikel`);
    } catch (err) {
      console.error(`✗ ${src.name}: ${err}`);
      results.push({ sourceId: src.id, newArticles: [] });
    }
  }

  return results;
}
