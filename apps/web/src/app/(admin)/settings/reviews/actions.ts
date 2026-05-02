'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

async function ctxHeaders(): Promise<{ tenantId: string; userId: string; role: string }> {
  const c = await getCurrentTenant();
  return { tenantId: c.tenantId, userId: c.userId, role: c.role };
}

function revalidate(): void {
  revalidatePath('/settings/reviews');
}

export async function toggleFeature(id: string, featured: boolean): Promise<void> {
  try {
    await apiFetch(`/v1/reviews/${id}/feature`, {
      method: 'PATCH',
      ...(await ctxHeaders()),
      body: { featured },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidate();
}

export async function deleteReview(id: string): Promise<void> {
  try {
    await apiFetch(`/v1/reviews/${id}`, {
      method: 'DELETE',
      ...(await ctxHeaders()),
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidate();
}

export async function importReview(formData: FormData): Promise<void> {
  const authorName = formData.get('authorName')?.toString().trim();
  const text = formData.get('text')?.toString().trim();
  const ratingRaw = formData.get('rating')?.toString();
  const sourceUrl = formData.get('sourceUrl')?.toString().trim() || null;

  if (!authorName || !text || !ratingRaw) {
    throw new Error('Name, Text und Sterne sind Pflichtfelder.');
  }
  const rating = Number.parseInt(ratingRaw, 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Sterne müssen zwischen 1 und 5 sein.');
  }

  try {
    await apiFetch('/v1/reviews/import', {
      method: 'POST',
      ...(await ctxHeaders()),
      body: { authorName, text, rating, sourceUrl, source: 'manual' },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidate();
}
