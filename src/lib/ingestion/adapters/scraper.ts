import { ApifyClient } from 'apify-client';
import type { ISourceAdapter, SourceConfig, NormalizedArticle } from './base';

interface ApifyConfig {
  actorId: string;
  input?: Record<string, unknown>;
  datasetFields?: {
    title?: string;
    content?: string;
    url?: string;
    image?: string;
    date?: string;
  };
}

export class ApifyScraperAdapter implements ISourceAdapter {
  readonly type = 'scraper';

  private client: ApifyClient;

  constructor() {
    this.client = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });
  }

  async fetch(source: SourceConfig): Promise<NormalizedArticle[]> {
    const config = source.config as unknown as ApifyConfig;
    const fields = config.datasetFields || {};

    const run = await this.client.actor(config.actorId).call(
      config.input || { startUrls: [{ url: source.url }] },
      { waitSecs: 120 },
    );

    if (!run.defaultDatasetId) {
      throw new Error(`Apify run produced no dataset: ${run.id}`);
    }

    const { items } = await this.client
      .dataset(run.defaultDatasetId)
      .listItems({ limit: 100 });

    return items
      .filter((item) => item[fields.title || 'title'] && item[fields.url || 'url'])
      .map((item) => ({
        externalId: String(item[fields.url || 'url']),
        title: String(item[fields.title || 'title']),
        content: String(item[fields.content || 'text'] || item[fields.content || 'content'] || ''),
        url: String(item[fields.url || 'url']),
        imageUrl: item[fields.image || 'image'] ? String(item[fields.image || 'image']) : undefined,
        language: source.language,
        publishedAt: item[fields.date || 'date']
          ? new Date(String(item[fields.date || 'date']))
          : null,
      }));
  }
}
