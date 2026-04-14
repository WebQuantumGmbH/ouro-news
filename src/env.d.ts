/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      sessionId: string;
      userId: string;
      email: string;
      displayName: string;
      role: 'admin' | 'editor' | 'user';
      avatarUrl: string | null;
    } | null;
  }
}
