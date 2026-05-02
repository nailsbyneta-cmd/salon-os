'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function createPromoCode(formData: FormData): Promise<{ error?: string }> {
  const ctx = await getCurrentTenant();

  const code = formData.get('code')?.toString().trim().toUpperCase() ?? '';
  const type = formData.get('type')?.toString();
  const value = Number(formData.get('value'));
  const minOrderChf = formData.get('minOrderChf')?.toString().trim();
  const maxUsages = formData.get('maxUsages')?.toString().trim();
  const expiresAt = formData.get('expiresAt')?.toString().trim();
  const note = formData.get('note')?.toString().trim();

  if (!code || code.length > 20) return { error: 'Code fehlt oder zu lang (max 20 Zeichen).' };
  if (type !== 'PERCENT' && type !== 'FIXED') return { error: 'Typ wählen.' };
  if (!Number.isFinite(value) || value <= 0) return { error: 'Gültigen Wert eingeben.' };
  if (type === 'PERCENT' && value > 100) return { error: 'Prozent-Wert max 100.' };

  const body: Record<string, unknown> = { code, type, value };
  if (minOrderChf) body['minOrderChf'] = Number(minOrderChf);
  if (maxUsages) body['maxUsages'] = Number(maxUsages);
  if (expiresAt) body['expiresAt'] = new Date(expiresAt).toISOString();
  if (note) body['note'] = note;

  try {
    await apiFetch('/v1/promo-codes', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.problem?.title ?? err.message };
    }
    throw err;
  }

  revalidatePath('/gift-cards/promo');
  return {};
}

export async function togglePromoCode(
  id: string,
  active: boolean,
): Promise<{ error?: string }> {
  const ctx = await getCurrentTenant();

  try {
    await apiFetch(`/v1/promo-codes/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { active },
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.problem?.title ?? err.message };
    }
    throw err;
  }

  revalidatePath('/gift-cards/promo');
  return {};
}
