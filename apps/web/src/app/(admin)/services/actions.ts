'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export async function createService(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  const categoryId = form.get('categoryId')?.toString();
  const durationMinutes = Number(form.get('durationMinutes'));
  const basePrice = Number(form.get('basePrice'));
  const description = form.get('description')?.toString().trim() || undefined;

  if (!name || !categoryId) throw new Error('Name und Kategorie sind Pflicht.');
  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    throw new Error('Dauer muss mindestens 5 Minuten sein.');
  }
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error('Preis muss >= 0 sein.');
  }

  try {
    await apiFetch('/v1/services', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        categoryId,
        name,
        slug: slugify(name),
        description,
        durationMinutes,
        basePrice,
        bookable: form.get('bookable') === 'on',
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/services');
  redirect('/services');
}

export async function createCategory(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  if (!name) throw new Error('Kategorie-Name fehlt.');

  await apiFetch('/v1/service-categories', {
    method: 'POST',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
    body: { name, order: 0 },
  });

  revalidatePath('/services');
  redirect('/services/new');
}

export async function deleteService(id: string): Promise<void> {
  const ctx = getCurrentTenant();
  await apiFetch(`/v1/services/${id}`, {
    method: 'DELETE',
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    role: ctx.role,
  });
  revalidatePath('/services');
}

export async function updateService(id: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const name = form.get('name')?.toString().trim();
  const durationMinutes = Number(form.get('durationMinutes'));
  const basePrice = Number(form.get('basePrice'));
  const description = form.get('description')?.toString().trim() || undefined;
  const bookable = form.get('bookable') === 'on';

  if (!name) throw new Error('Name fehlt.');

  try {
    await apiFetch(`/v1/services/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {
        name,
        description,
        durationMinutes,
        basePrice,
        bookable,
      },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }

  revalidatePath('/services');
  redirect('/services');
}
