import type { APIRoute } from 'astro';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@lib/db/client';
import { sources } from '@lib/db/schema';

export const prerender = false;

// GET: Alle Quellen auflisten
export const GET: APIRoute = async () => {
  const allSources = await db.select().from(sources);
  return new Response(JSON.stringify({ sources: allSources }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: Neue Quelle erstellen
export const POST: APIRoute = async ({ request }) => {
  const body = (await request.json()) as {
    name: string;
    type: 'rss' | 'api' | 'scraper' | 'social';
    url: string;
    config?: Record<string, unknown>;
    language?: string;
    country?: string;
    updateIntervalMinutes?: number;
  };

  if (!body.name || !body.type || !body.url) {
    return new Response(JSON.stringify({ error: 'name, type, url sind Pflichtfelder' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const id = randomUUID();
  await db.insert(sources).values({
    id,
    name: body.name,
    type: body.type,
    url: body.url,
    config: body.config || {},
    language: body.language || 'en',
    country: body.country || 'US',
    updateIntervalMinutes: body.updateIntervalMinutes || 60,
  });

  return new Response(JSON.stringify({ id, message: 'Quelle erstellt' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};

// PUT: Quelle aktualisieren
export const PUT: APIRoute = async ({ request }) => {
  const body = (await request.json()) as { id: string; [key: string]: unknown };
  if (!body.id) {
    return new Response(JSON.stringify({ error: 'id ist Pflichtfeld' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id, ...updates } = body;
  await db.update(sources).set(updates).where(eq(sources.id, id as string));

  return new Response(JSON.stringify({ message: 'Quelle aktualisiert' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// DELETE: Quelle löschen
export const DELETE: APIRoute = async ({ request }) => {
  const body = (await request.json()) as { id: string };
  if (!body.id) {
    return new Response(JSON.stringify({ error: 'id ist Pflichtfeld' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.delete(sources).where(eq(sources.id, body.id));

  return new Response(JSON.stringify({ message: 'Quelle gelöscht' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
