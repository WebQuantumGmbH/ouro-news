import { randomUUID } from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '../db/client';
import { sessions, users } from '../db/schema';
import type { AstroCookies } from 'astro';

const SESSION_COOKIE = 'ouro_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export async function createSession(userId: string): Promise<string> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  return sessionId;
}

export async function getSessionUser(cookies: AstroCookies) {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const result = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return result[0] || null;
}

export function setSessionCookie(cookies: AstroCookies, sessionId: string) {
  cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE / 1000,
  });
}

export async function destroySession(cookies: AstroCookies) {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
