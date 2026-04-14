import type { ISourceAdapter, SourceConfig, NormalizedArticle } from './base';

interface NewsApiConfig {
  apiKey: string;
  query?: string;
  category?: string;
  sources?: string;
  pageSize?: number;
}

interface NewsApiArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { id: string; name: string };
}

export class NewsApiAdapter implements ISourceAdapter {
  readonly type = 'api';

  async fetch(source: SourceConfig): Promise<NormalizedArticle[]> {
    const config = source.config as unknown as NewsApiConfig;
    const params = new URLSearchParams({
      apiKey: config.apiKey,
      language: source.language,
      pageSize: String(config.pageSize || 50),
    });

    if (config.query) params.set('q', config.query);
    if (config.category) params.set('category', config.category);
    if (config.sources) params.set('sources', config.sources);

    const endpoint = config.query ? 'everything' : 'top-headlines';
    const res = await fetch(`https://newsapi.org/v2/${endpoint}?${params}`);

    if (!res.ok) throw new Error(`NewsAPI error: ${res.status} ${res.statusText}`);

    const data = (await res.json()) as { articles: NewsApiArticle[] };
    return data.articles.map((a) => ({
      externalId: a.url,
      title: a.title,
      content: a.content || a.description || '',
      url: a.url,
      imageUrl: a.urlToImage || undefined,
      language: source.language,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
    }));
  }
}
