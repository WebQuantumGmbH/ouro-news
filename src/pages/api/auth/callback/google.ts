import type { APIRoute } from 'astro';
import { Google } from 'arctic';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@lib/db/client';
import { users } from '@lib/db/schema';
import { createSession, setSessionCookie } from '@lib/auth/session';

const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!,
);

interface GoogleUser {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const storedState = cookies.get('google_oauth_state')?.value;
  const codeVerifier = cookies.get('google_code_verifier')?.value;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return new Response('Invalid OAuth callback', { status: 400 });
  }

  // Cleanup cookies
  cookies.delete('google_oauth_state', { path: '/' });
  cookies.delete('google_code_verifier', { path: '/' });

  const tokens = await google.validateAuthorizationCode(code, codeVerifier);
  const accessToken = tokens.accessToken();

  // Google Profil laden
  const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    return new Response('Failed to fetch Google profile', { status: 500 });
  }
  const profile = (await profileRes.json()) as GoogleUser;

  // User in DB suchen oder erstellen
  let [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.googleId, profile.sub));

  if (!existingUser) {
    const userId = randomUUID();
    await db.insert(users).values({
      id: userId,
      email: profile.email,
      googleId: profile.sub,
      displayName: profile.name,
      avatarUrl: profile.picture,
      role: 'user',
    });
    [existingUser] = await db.select().from(users).where(eq(users.id, userId));
  }

  // Session erstellen
  const sessionId = await createSession(existingUser.id);
  setSessionCookie(cookies, sessionId);

  return redirect('/');
};
