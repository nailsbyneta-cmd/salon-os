'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

function ctxHeaders(): { tenantId: string; userId: string; role: string } {
  const c = getCurrentTenant();
  return { tenantId: c.tenantId, userId: c.userId, role: c.role };
}

function str(form: FormData, key: string): string | null {
  const v = form.get(key)?.toString().trim();
  return v ? v : null;
}

function bool(form: FormData, key: string): boolean {
  return form.get(key) === 'on';
}

function int(form: FormData, key: string): number | null {
  const v = form.get(key)?.toString().trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function revalidateAll(): void {
  revalidatePath('/settings');
  revalidatePath('/book/beautycenter-by-neta');
}

// ── Location ────────────────────────────────

export async function saveLocationHours(
  locationId: string,
  schedule: Record<string, Array<{ open: string; close: string }>>,
): Promise<void> {
  try {
    await apiFetch(`/v1/locations/${locationId}`, {
      method: 'PATCH',
      ...ctxHeaders(),
      body: { openingHours: schedule },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidateAll();
}

export async function updateLocation(locationId: string, form: FormData): Promise<void> {
  const name = form.get('name')?.toString().trim();
  if (!name) throw new Error('Name ist Pflicht.');

  const body: Record<string, unknown> = {
    name,
    address1: form.get('address1')?.toString().trim() || undefined,
    address2: form.get('address2')?.toString().trim() || undefined,
    city: form.get('city')?.toString().trim() || undefined,
    postalCode: form.get('postalCode')?.toString().trim() || undefined,
    phone: form.get('phone')?.toString().trim() || undefined,
    email: form.get('email')?.toString().trim() || undefined,
  };

  try {
    await apiFetch(`/v1/locations/${locationId}`, {
      method: 'PATCH',
      ...ctxHeaders(),
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidateAll();
  redirect('/settings?saved=1');
}

// ── Branding ────────────────────────────────

export async function updateBranding(form: FormData): Promise<void> {
  const body = {
    tagline: str(form, 'tagline'),
    description: str(form, 'description'),
    logoUrl: str(form, 'logoUrl'),
    heroImageUrl: str(form, 'heroImageUrl'),
    brandColor: str(form, 'brandColor'),
    instagramUrl: str(form, 'instagramUrl'),
    facebookUrl: str(form, 'facebookUrl'),
    tiktokUrl: str(form, 'tiktokUrl'),
    whatsappE164: str(form, 'whatsappE164'),
    googleBusinessUrl: str(form, 'googleBusinessUrl'),
  };
  try {
    await apiFetch('/v1/salon/branding', {
      method: 'PATCH',
      ...ctxHeaders(),
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidateAll();
  redirect('/settings?saved=1');
}

// ── FAQ ─────────────────────────────────────

export async function createFaq(form: FormData): Promise<void> {
  const question = str(form, 'question');
  const answer = str(form, 'answer');
  if (!question || !answer) throw new Error('Frage + Antwort sind Pflicht.');
  try {
    await apiFetch('/v1/salon/faqs', {
      method: 'POST',
      ...ctxHeaders(),
      body: { question, answer, order: int(form, 'order') ?? 0 },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidateAll();
  redirect('/settings#faq');
}

export async function deleteFaq(id: string): Promise<void> {
  await apiFetch(`/v1/salon/faqs/${id}`, {
    method: 'DELETE',
    ...ctxHeaders(),
  });
  revalidateAll();
  redirect('/settings#faq');
}

// ── Reviews ─────────────────────────────────

export async function createReview(form: FormData): Promise<void> {
  const authorName = str(form, 'authorName');
  const text = str(form, 'text');
  const rating = int(form, 'rating');
  if (!authorName || !text || rating == null || rating < 1 || rating > 5) {
    throw new Error('Name, Bewertung (1–5) und Text sind Pflicht.');
  }
  await apiFetch('/v1/salon/reviews', {
    method: 'POST',
    ...ctxHeaders(),
    body: {
      authorName,
      rating,
      text,
      sourceUrl: str(form, 'sourceUrl'),
      featured: bool(form, 'featured'),
    },
  });
  revalidateAll();
  redirect('/settings#reviews');
}

export async function deleteReview(id: string): Promise<void> {
  await apiFetch(`/v1/salon/reviews/${id}`, {
    method: 'DELETE',
    ...ctxHeaders(),
  });
  revalidateAll();
  redirect('/settings#reviews');
}

export async function toggleReviewFeatured(id: string, featured: boolean): Promise<void> {
  await apiFetch(`/v1/salon/reviews/${id}`, {
    method: 'PATCH',
    ...ctxHeaders(),
    body: { featured },
  });
  revalidateAll();
  redirect('/settings#reviews');
}

// ── Gallery ─────────────────────────────────

export async function createGalleryImage(form: FormData): Promise<void> {
  const imageUrl = str(form, 'imageUrl');
  if (!imageUrl) throw new Error('Bild-URL ist Pflicht.');
  await apiFetch('/v1/salon/gallery', {
    method: 'POST',
    ...ctxHeaders(),
    body: {
      imageUrl,
      caption: str(form, 'caption'),
      order: int(form, 'order') ?? 0,
    },
  });
  revalidateAll();
  redirect('/settings#gallery');
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await apiFetch(`/v1/salon/gallery/${id}`, {
    method: 'DELETE',
    ...ctxHeaders(),
  });
  revalidateAll();
  redirect('/settings#gallery');
}
