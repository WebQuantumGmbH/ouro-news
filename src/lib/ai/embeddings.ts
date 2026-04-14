import { createEmbedding } from './openai';
import { upsertArticleVector } from '../vector/collections';

export async function generateAndStoreEmbedding(
  articleId: string,
  title: string,
  content: string,
  metadata: {
    published_at: string;
    source_country: string;
    topics: string[];
    sentiment_score: number;
    political_leaning: number;
  },
): Promise<number[]> {
  const textForEmbedding = `${title}\n\n${content.slice(0, 4000)}`;
  const vector = await createEmbedding(textForEmbedding);

  await upsertArticleVector(articleId, vector, {
    article_id: articleId,
    title,
    ...metadata,
  });

  return vector;
}
