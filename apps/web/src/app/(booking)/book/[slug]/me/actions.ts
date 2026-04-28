'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'salon_customer_session';
const API_URL = process.env['PUBLIC_API_URL'] ?? 'http://localhost:4000';

export async function requestMagicLink(formData: FormData): Promise<void> {
  const slug = String(formData.get('slug') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  if (!slug || !email) return;

  await fetch(`${API_URL}/v1/public/${slug}/me/request-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
    cache: 'no-store',
  });
  // IMMER zur Bestätigungs-Page — Privacy: kein Hinweis ob die Email
  // tatsächlich existierte (Email-Enumeration-Schutz).
  redirect(`/book/${slug}/me/login?sent=1`);
}

export async function logout(slug: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  if (sessionToken) {
    await fetch(`${API_URL}/v1/public/me/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });
  }
  cookieStore.delete(COOKIE_NAME);
  redirect(`/book/${slug}/me/login`);
}

/**
 * DSGVO-Account-Löschung. Setzt deletedAt + revoked alle Sessions auf
 * Server-Seite, dann Cookie weg + redirect Booking-Übersicht.
 */
export async function deleteMyAccount(slug: string): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  if (sessionToken) {
    await fetch(`${API_URL}/v1/public/me/delete`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sessionToken}` },
      cache: 'no-store',
    });
  }
  cookieStore.delete(COOKIE_NAME);
  redirect(`/book/${slug}?account-deleted=1`);
}
