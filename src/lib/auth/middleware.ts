import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './session';

export const authMiddleware = defineMiddleware(async (context, next) => {
  const user = await getSessionUser(context.cookies);
  context.locals.user = user;

  // Admin-Bereich schützen
  if (context.url.pathname.startsWith('/admin') || context.url.pathname.startsWith('/api/admin')) {
    if (!user) {
      return context.redirect('/api/auth/login');
    }
    if (user.role !== 'admin' && user.role !== 'editor') {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return next();
});
