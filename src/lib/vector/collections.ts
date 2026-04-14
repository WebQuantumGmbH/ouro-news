import { qdrant, COLLECTIONS } from './client';

const EMBEDDING_DIM = 1536; // text-embedding-3-small

export async function ensureCollections(): Promise<void> {
  for (const [key, name] of Object.entries(COLLECTIONS)) {
    const exists = await qdrant.collectionExists(name);
    if (exists.exists) continue;

    const distance = 'Cosine' as const;

    if (key === 'articles') {
      await qdrant.createCollection(name, {
        vectors: { size: EMBEDDING_DIM, distance },
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'article_id',
        field_schema: 'keyword',
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'source_country',
        field_schema: 'keyword',
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'published_at',
        field_schema: 'datetime',
      });
    }

    if (key === 'patterns') {
      await qdrant.createCollection(name, {
        vectors: { size: EMBEDDING_DIM, distance },
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'topic',
        field_schema: 'keyword',
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'time_window',
        field_schema: 'keyword',
      });
    }

    if (key === 'topics') {
      await qdrant.createCollection(name, {
        vectors: { size: EMBEDDING_DIM, distance },
      });
      await qdrant.createPayloadIndex(name, {
        field_name: 'topic_id',
        field_schema: 'keyword',
      });
    }

    console.log(`✓ Collection "${name}" erstellt`);
  }
}

export async function upsertArticleVector(
  articleId: string,
  vector: number[],
  payload: {
    article_id: string;
    title: string;
    published_at: string;
    source_country: string;
    topics: string[];
    sentiment_score: number;
    political_leaning: number;
  },
): Promise<void> {
  await qdrant.upsert(COLLECTIONS.articles, {
    points: [
      {
        id: articleId,
        vector,
        payload,
      },
    ],
  });
}

export async function searchSimilarArticles(
  vector: number[],
  limit = 10,
  filter?: Record<string, unknown>,
): Promise<unknown[]> {
  const result = await qdrant.search(COLLECTIONS.articles, {
    vector,
    limit,
    with_payload: true,
    ...(filter ? { filter } : {}),
  });
  return result;
}

export async function searchPatterns(
  vector: number[],
  limit = 5,
  filter?: Record<string, unknown>,
): Promise<unknown[]> {
  const result = await qdrant.search(COLLECTIONS.patterns, {
    vector,
    limit,
    with_payload: true,
    ...(filter ? { filter } : {}),
  });
  return result;
}

export async function upsertPatternVector(
  id: string,
  vector: number[],
  payload: {
    topic: string;
    time_window: string;
    countries: string[];
    sentiment_trend: number[];
    description: string;
  },
): Promise<void> {
  await qdrant.upsert(COLLECTIONS.patterns, {
    points: [{ id, vector, payload }],
  });
}
