import { createEmbedding } from '../ai/openai';
import { searchSimilarArticles } from '../vector/collections';

const URL_HASH_SET = new Set<string>();

export function isDuplicateByUrl(url: string): boolean {
  if (URL_HASH_SET.has(url)) return true;
  URL_HASH_SET.add(url);
  return false;
}

export async function isDuplicateSemantic(
  title: string,
  content: string,
  threshold = 0.92,
): Promise<boolean> {
  try {
    const vector = await createEmbedding(`${title}\n${content.slice(0, 500)}`);
    const results = await searchSimilarArticles(vector, 1);
    if (results.length > 0) {
      const top = results[0] as { score: number };
      return top.score >= threshold;
    }
  } catch {
    // Wenn Qdrant/OpenAI nicht erreichbar: kein Duplikat annehmen
  }
  return false;
}
