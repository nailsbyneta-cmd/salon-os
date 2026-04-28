'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME } from '@salon-os/auth';

const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

/**
 * Logout: löscht den `salon_session` Cookie, sagt der API Bescheid (für
 * eventuelle WorkOS-Logout-Hooks), redirected zur /login.
 */
export async function logoutAction(): Promise<void> {
  // 1. API hinten herum benachrichtigen (best-effort, schlucken wenn fehlt)
  try {
    await fetch(`${API_URL}/v1/public/auth/logout`, {
      method: 'POST',
      cache: 'no-store',
    });
  } catch {
    /* ignore */
  }
  // 2. Lokal löschen (das ist die SoT — auch wenn API down ist sind wir abgemeldet)
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}
