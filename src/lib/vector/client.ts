import { QdrantClient } from '@qdrant/js-client-rest';

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://webquantum.info:16333',
});

export const COLLECTIONS = {
  articles: process.env.QDRANT_COLLECTION_ARTICLES || 'ouro_articles',
  patterns: process.env.QDRANT_COLLECTION_PATTERNS || 'ouro_patterns',
  topics: process.env.QDRANT_COLLECTION_TOPICS || 'ouro_topics',
} as const;
