'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

interface ClientBody {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
  emailOptIn: boolean;
  smsOptIn: boolean;
}

function parseForm(form: FormData): ClientBody {
  const firstName = form.get('firstName')?.toString().trim();
  const lastName = form.get('lastName')?.toString().trim();
  if (!firstName || !lastName) throw new Error('Vorname + Nachname sind Pflicht.');
  const email = form.get('email')?.toString().trim() || undefined;
  const phone = form.get('phone')?.toString().trim() || undefined;
  const birthdayRaw = form.get('birthday')?.toString().trim();
  const birthday = birthdayRaw ? birthdayRaw : undefined;
  const notes = form.get('notes')?.toString().trim() || undefined;
  const tagsRaw = form.get('tags')?.toString().trim() ?? '';
  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10)
    : undefined;
  return {
    firstName,
    lastName,
    email,
    phone,
    birthday,
    notes,
    tags,
    emailOptIn: form.get('emailOptIn') === 'on',
    smsOptIn: form.get('smsOptIn') === 'on',
  };
}

export async function createClient(form: FormData): Promise<void> {
  const ctx = getCurrentTenant();
  const body = parseForm(form);
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
  const body = parseForm(form);
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
