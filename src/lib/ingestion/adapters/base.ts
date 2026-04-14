export interface NormalizedArticle {
  externalId: string;
  title: string;
  content: string;
  url: string;
  imageUrl?: string;
  language: string;
  publishedAt: Date | null;
}

export interface SourceConfig {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'scraper' | 'social';
  url: string;
  config: Record<string, unknown>;
  language: string;
  country: string;
}

export interface ISourceAdapter {
  readonly type: string;
  fetch(source: SourceConfig): Promise<NormalizedArticle[]>;
}
