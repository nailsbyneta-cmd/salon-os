'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ClientBody {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  birthday?: string | null;
  notesInternal?: string | null;
  tags?: string[];
  emailOptIn: boolean;
  smsOptIn: boolean;
}

function parseForm(form: FormData, mode: 'create' | 'update'): ClientBody {
  const firstName = form.get('firstName')?.toString().trim();
  const lastName = form.get('lastName')?.toString().trim();
  if (!firstName || !lastName) throw new Error('Vorname + Nachname sind Pflicht.');

  // Bei Update: leerer String = löschen (null). Bei Create: leerer String = weglassen.
  const nullable = (k: string): string | null | undefined => {
    const raw = form.get(k);
    if (raw === null) return undefined;
    const v = raw.toString().trim();
    if (v === '') return mode === 'update' ? null : undefined;
    return v;
  };

  const tagsRaw = form.get('tags')?.toString().trim() ?? '';
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)
    : mode === 'update'
      ? []
      : undefined;

  return {
    firstName,
    lastName,
    email: nullable('email'),
    phone: nullable('phone'),
    birthday: nullable('birthday'),
    notesInternal: nullable('notes'),
    tags,
    emailOptIn: form.get('emailOptIn') === 'on',
    smsOptIn: form.get('smsOptIn') === 'on',
  };
}

export async function createClient(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const body = parseForm(form, 'create');
  try {
    const created = await apiFetch<{ id: string }>('/v1/clients', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
    revalidatePath('/clients');
    redirect(`/clients/${created.id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status !== 307 /* redirect */) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }
}

export async function updateClient(id: string, form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const body = parseForm(form, 'update');
  try {
    await apiFetch(`/v1/clients/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }
  revalidatePath(`/clients/${id}`);
  revalidatePath('/clients');
  redirect(`/clients/${id}`);
}

/**
 * Toggle `blocked`-Flag einer Kundin via PATCH /v1/clients/:id.
 * blocked=true schliesst sie aus: Birthday-Gratulieren, Win-Back,
 * Waitlist-Match. Rückgängig machen via erneutes Toggle.
 */
export async function toggleClientBlocked(
  id: string,
  nextBlocked: boolean,
): Promise<void> {
  const ctx = getCurrentTenant();
  try {
    await apiFetch(`/v1/clients/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { blocked: nextBlocked },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.problem?.title ?? err.message);
    }
    throw err;
  }
  revalidatePath(`/clients/${id}`);
  revalidatePath('/clients');
  revalidatePath('/');
}
