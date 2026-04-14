import { authMiddleware } from './lib/auth/middleware';

export const onRequest = authMiddleware;
