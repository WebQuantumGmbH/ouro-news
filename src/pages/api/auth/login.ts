import type { APIRoute } from 'astro';
import { Google, generateState, generateCodeVerifier } from 'arctic';

const google = new Google(
  process.env.GOOGLE_CLIENT_ID!,
  process.env.GOOGLE_CLIENT_SECRET!,
  process.env.GOOGLE_REDIRECT_URI!,
);

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  cookies.set('google_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const url = google.createAuthorizationURL(state, codeVerifier, [
    'openid',
    'profile',
    'email',
  ]);

  return redirect(url.toString());
};
