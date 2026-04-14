import Parser from 'rss-parser';
import type { ISourceAdapter, SourceConfig, NormalizedArticle } from './base';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'ouro.news/1.0 RSS Reader',
  },
});

export class RssAdapter implements ISourceAdapter {
  readonly type = 'rss';

  async fetch(source: SourceConfig): Promise<NormalizedArticle[]> {
    const feed = await parser.parseURL(source.url);
    const articles: NormalizedArticle[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      articles.push({
        externalId: item.guid || item.link,
        title: item.title,
        content: item['content:encoded'] || item.contentSnippet || item.content || '',
        url: item.link,
        imageUrl: extractImage(item),
        language: source.language,
        publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      });
    }

    return articles;
  }
}

function extractImage(item: Record<string, unknown>): string | undefined {
  if (item.enclosure && typeof item.enclosure === 'object') {
    const enc = item.enclosure as Record<string, string>;
    if (enc.url && enc.type?.startsWith('image/')) return enc.url;
  }
  const content = String(item['content:encoded'] || item.content || '');
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  return match?.[1];
}
