import type { APIRoute } from 'astro';
import { destroySession } from '@lib/auth/session';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies);
  return redirect('/');
};
