import type { ISourceAdapter, SourceConfig, NormalizedArticle } from './base';

interface SocialConfig {
  platform: 'reddit' | 'twitter';
  // Reddit
  subreddit?: string;
  // Twitter
  bearerToken?: string;
  query?: string;
}

export class SocialAdapter implements ISourceAdapter {
  readonly type = 'social';

  async fetch(source: SourceConfig): Promise<NormalizedArticle[]> {
    const config = source.config as unknown as SocialConfig;

    switch (config.platform) {
      case 'reddit':
        return this.fetchReddit(source, config);
      case 'twitter':
        return this.fetchTwitter(source, config);
      default:
        throw new Error(`Unsupported social platform: ${config.platform}`);
    }
  }

  private async fetchReddit(source: SourceConfig, config: SocialConfig): Promise<NormalizedArticle[]> {
    const subreddit = config.subreddit || source.url.split('/r/')[1]?.split('/')[0];
    if (!subreddit) throw new Error('No subreddit specified');

    const res = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=50`, {
      headers: { 'User-Agent': 'ouro.news/1.0' },
    });
    if (!res.ok) throw new Error(`Reddit error: ${res.status}`);

    const data = (await res.json()) as { data: { children: { data: Record<string, unknown> }[] } };

    return data.data.children
      .filter((c) => !c.data.stickied)
      .map((c) => ({
        externalId: String(c.data.id),
        title: String(c.data.title),
        content: String(c.data.selftext || c.data.title),
        url: String(c.data.url),
        imageUrl: typeof c.data.thumbnail === 'string' && c.data.thumbnail.startsWith('http')
          ? c.data.thumbnail
          : undefined,
        language: source.language,
        publishedAt: c.data.created_utc ? new Date(Number(c.data.created_utc) * 1000) : null,
      }));
  }

  private async fetchTwitter(source: SourceConfig, config: SocialConfig): Promise<NormalizedArticle[]> {
    if (!config.bearerToken || !config.query) {
      throw new Error('Twitter adapter requires bearerToken and query');
    }

    const params = new URLSearchParams({
      query: config.query,
      max_results: '50',
      'tweet.fields': 'created_at,text,author_id',
    });

    const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: { Authorization: `Bearer ${config.bearerToken}` },
    });
    if (!res.ok) throw new Error(`Twitter error: ${res.status}`);

    const data = (await res.json()) as { data: { id: string; text: string; created_at: string }[] };

    return (data.data || []).map((t) => ({
      externalId: t.id,
      title: t.text.slice(0, 120),
      content: t.text,
      url: `https://twitter.com/i/web/status/${t.id}`,
      language: source.language,
      publishedAt: t.created_at ? new Date(t.created_at) : null,
    }));
  }
}
