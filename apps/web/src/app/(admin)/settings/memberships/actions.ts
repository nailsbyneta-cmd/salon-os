'use server';
import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '@/lib/api';
import { getCurrentTenant } from '@/lib/tenant';

export async function createPlan(formData: FormData): Promise<void> {
  const ctx = await getCurrentTenant();
  const sessionCreditsRaw = String(formData.get('sessionCredits') ?? '').trim();
  const discountPctRaw = String(formData.get('discountPct') ?? '').trim();
  const body = {
    name: String(formData.get('name') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || undefined,
    priceChf: Number(formData.get('priceChf') ?? 0),
    billingCycle: String(formData.get('billingCycle') ?? 'MONTHLY'),
    sessionCredits: sessionCreditsRaw !== '' ? Number(sessionCreditsRaw) : null,
    discountPct: discountPctRaw !== '' ? Number(discountPctRaw) : null,
    active: true,
  };
  if (!body.name) throw new Error('Plan-Name ist Pflicht.');
  try {
    await apiFetch('/v1/memberships/plans', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body,
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/memberships');
}

export async function togglePlan(id: string, active: boolean): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch(`/v1/memberships/plans/${id}`, {
      method: 'PATCH',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { active },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/memberships');
}

export async function subscribeMember(clientId: string, planId: string): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch('/v1/memberships/subscribe', {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: { clientId, planId },
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/memberships');
  revalidatePath(`/clients/${clientId}`);
}

export async function cancelMembership(id: string): Promise<void> {
  const ctx = await getCurrentTenant();
  try {
    await apiFetch(`/v1/memberships/${id}/cancel`, {
      method: 'POST',
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      role: ctx.role,
      body: {},
    });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.problem?.title ?? err.message);
    throw err;
  }
  revalidatePath('/settings/memberships');
}
