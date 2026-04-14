import { db } from '../db/client';
import { wdfIdfScores, articles } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const STOP_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer',
  'und', 'oder', 'aber', 'als', 'auch', 'auf', 'aus', 'bei', 'bis', 'für', 'gegen',
  'in', 'mit', 'nach', 'nicht', 'noch', 'nur', 'über', 'um', 'unter', 'von', 'vor',
  'wie', 'zu', 'zum', 'zur', 'sich', 'ist', 'sind', 'war', 'hat', 'haben', 'wird',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'has', 'have', 'had',
  'that', 'this', 'it', 'not', 'as', 'do', 'does', 'did', 'will', 'would', 'can',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zäöüß\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function calculateWdf(term: string, tokens: string[]): number {
  const count = tokens.filter((t) => t === term).length;
  return Math.log2(count + 1) / Math.log2(tokens.length + 1);
}

export async function calculateWdfIdf(articleId: string, content: string): Promise<void> {
  const tokens = tokenize(content);
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) || 0) + 1);
  }

  // Gesamtzahl der Dokumente
  const [{ count: totalDocs }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles);

  // Alte Scores löschen
  await db.delete(wdfIdfScores).where(eq(wdfIdfScores.articleId, articleId));

  const uniqueTerms = [...termFreq.keys()];
  const values: {
    id: string;
    articleId: string;
    term: string;
    wdfScore: number;
    idfScore: number;
    wdfIdfScore: number;
  }[] = [];

  for (const term of uniqueTerms) {
    const wdf = calculateWdf(term, tokens);

    // Wie viele Dokumente enthalten diesen Term? approximiert über content LIKE
    const [{ count: docsWithTerm }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(sql`LOWER(${articles.content}) LIKE ${`%${term}%`}`);

    const idf = Math.log2((totalDocs + 1) / (docsWithTerm + 1));
    const wdfIdf = wdf * idf;

    if (wdfIdf > 0.01) {
      values.push({
        id: randomUUID(),
        articleId,
        term,
        wdfScore: wdf,
        idfScore: idf,
        wdfIdfScore: wdfIdf,
      });
    }
  }

  // Top 50 Terme speichern
  values.sort((a, b) => b.wdfIdfScore - a.wdfIdfScore);
  const top = values.slice(0, 50);

  if (top.length > 0) {
    await db.insert(wdfIdfScores).values(top);
  }
}
